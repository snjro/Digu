import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import type { EthersEventLog, SyncStatusContract } from "@db/dbTypes";
import { getSyncLockName } from "@db/constants";
import {
  installFakeLockManager,
  removeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";

// Two browser tabs: each has its own copy of the modules (stores), and both
// share IndexedDB (fake-indexeddb) and navigator.locks.

// One log per block for the first event of each contract.
vi.mock("@utils/utilsEthers", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsEthers")>();
  return {
    ...original,
    getNodeProvider: async () => ({}),
    getEthersEventLogs: async (
      eventNames: string[],
      _contract: unknown,
      from: number,
      to: number,
    ): Promise<EthersEventLog[]> => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const logs = [];
      for (let blockNumber = from; blockNumber <= to; blockNumber++) {
        const hex = "0x" + blockNumber.toString(16).padStart(64, "0");
        logs.push({
          eventName: eventNames[0],
          eventSignature: "Test()",
          args: [],
          blockNumber: blockNumber,
          blockHash: hex,
          data: "0x",
          index: 0,
          removed: false,
          topics: [hex],
          address: "0x" + "1".repeat(40),
          transactionHash: hex,
          transactionIndex: 0,
        });
      }
      return logs as unknown as EthersEventLog[];
    },
  };
});
vi.mock("./eventLogsContractBlockTimes", () => ({
  fetchBlockTimesForEventLogs: async (
    _nodeProvider: unknown,
    _chainName: unknown,
    logs: EthersEventLog[],
  ) =>
    [...new Set(logs.map((log) => log.blockNumber))].map((blockNumber) => ({
      fetchedBlockTime: {
        blockNumber,
        timestamp: blockNumber,
        isoDatetime: "",
      },
      fetchedFromProvider: false,
    })),
}));
vi.mock("./updateLatestBlockNumber", () => ({
  startUpdateLatestBlockNumber: async () => {},
}));

const chain: Chain = TARGET_CHAINS[0];
const project = chain.projects[0];
const version = project.versions[0];
const versionIdentifier = {
  chainName: chain.name,
  projectName: project.name,
  versionName: version.name,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(
  condition: () => boolean | Promise<boolean>,
): Promise<boolean> {
  for (let i = 0; i < 250; i++) {
    if (await condition()) return true;
    await sleep(20);
  }
  return false;
}

// Opens a tab: what initialize() does, with the worker functions called
// directly.
async function openTab() {
  vi.resetModules();
  const { dbWorkerFuncInitializeDBSettings } =
    await import("@db/db.worker.func.InitializeDBSettings");
  const { dbWorkerFuncInitializeDBSyncStatus } =
    await import("@db/db.worker.func.InitializeDBSyncStatus");
  const { initializeStore } = await import("../initialization/initializeStore");
  const syncLock = await import("./syncLock");
  await dbWorkerFuncInitializeDBSettings();
  await dbWorkerFuncInitializeDBSyncStatus();
  await initializeStore();
  await syncLock.watchSyncLocksOfOtherTabs();

  const { extractEventContracts } = await import("@utils/utilsEthers");
  const contract: Contract = extractEventContracts(version.contracts)[0];
  const { DbEventLogs } = await import("@db/dbEventLogs");
  const { fetchEventLogs } = await import("./eventLogs");
  const { startAbortingInChain } =
    await import("@db/dbEventLogsDataHandlersSyncStatus");
  const { syncStatusContract } = await import("./eventLogsContract");
  const { storeSyncStatus } = await import("@stores/storeSyncStatus");
  const { storeChainStatus } = await import("@stores/storeChainStatus");
  const { get } = await import("svelte/store");
  storeChainStatus.updateState(chain.name, {
    nodeStatus: "SUCCESS",
    // Above every contract, so that no loop waits for a new block.
    latestBlockNumber:
      Math.max(
        ...chain.projects.flatMap((targetProject) =>
          targetProject.versions.flatMap((targetVersion) =>
            targetVersion.contracts.map(
              (targetContract) => targetContract.creation.blockNumber,
            ),
          ),
        ),
      ) + 1_000_000,
  });
  const db = new DbEventLogs(versionIdentifier);
  return {
    contract,
    db,
    fetchEventLogs: () => fetchEventLogs(chain),
    stop: () => startAbortingInChain(chain.name),
    storeStatus: (): SyncStatusContract =>
      syncStatusContract({ ...versionIdentifier, contractName: contract.name }),
    // true while any contract of the chain syncs.
    isChainSyncing: (): boolean => get(storeSyncStatus)[chain.name].isSyncing,
    isLockedByOtherTab: (): boolean =>
      get(syncLock.storeSyncLockedByOtherTab)[chain.name],
  };
}
type Tab = Awaited<ReturnType<typeof openTab>>;

async function dbStatus(tab: Tab): Promise<SyncStatusContract> {
  return await tab.db.table("SyncStatus").get(tab.contract.name);
}
async function countLogs(tab: Tab): Promise<{ rows: number; unique: number }> {
  const rows = await tab.db
    .table(`${tab.contract.name}_${tab.contract.events.names[0]}`)
    .toArray();
  const unique = new Set(
    rows.map((row) => `${row.blockNumber}-${row.logIndex}`),
  );
  return { rows: rows.length, unique: unique.size };
}
// Waits until every contract loop has ended and the tab released the lock.
async function stopAndWait(tab: Tab): Promise<void> {
  await tab.stop();
  expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
  expect(tab.storeStatus().syncStateText).toBe("stopped");
}
async function isSyncLockHeld(): Promise<boolean> {
  if (!navigator.locks) return false;
  const { held } = await navigator.locks.query();
  return !!held?.some((lock) => lock.name === getSyncLockName(chain.name));
}

describe("sync with two tabs (issue #49)", () => {
  let tabs: Tab[] = [];
  let lockManager: FakeLockManager;
  beforeEach(async () => {
    lockManager = installFakeLockManager();
    const { Dexie } = await import("dexie");
    for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
  });
  afterEach(async () => {
    for (const tab of tabs) {
      if (tab.storeStatus().isSyncing) await stopAndWait(tab);
    }
    tabs = [];
    // A sync left running would write into the next test's DB.
    expect(await isSyncLockHeld()).toBe(false);
  });

  test("opening tab B keeps tab A's sync status, and A can still stop", async () => {
    const a = await openTab();
    tabs.push(a);
    // Before the fix, fetchEventLogs() resolved only when the sync ended.
    const startedA = a.fetchEventLogs();
    await sleep(100);

    const b = await openTab();
    tabs.push(b);
    expect((await dbStatus(a)).isSyncing).toBe(true);
    expect(await startedA).toBe(true);
    expect(b.isLockedByOtherTab()).toBe(true);

    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
    expect(b.storeStatus().syncStateText).toBe("stopped");
  }, 30_000);

  test("tab A can sync again after it stops while tab B waits", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await sleep(50);
    const b = await openTab();
    tabs.push(b);

    await stopAndWait(a);
    expect(await waitFor(() => !a.isLockedByOtherTab())).toBe(true);
    expect(await a.fetchEventLogs()).toBe(true);
    expect(b.isLockedByOtherTab()).toBe(false);
    expect(await waitFor(() => a.storeStatus().isSyncing)).toBe(true);
    await stopAndWait(a);
  }, 30_000);

  test("tab B cannot sync while tab A syncs", async () => {
    const a = await openTab();
    tabs.push(a);
    const b = await openTab();
    tabs.push(b);
    expect(await a.fetchEventLogs()).toBe(true);
    await sleep(50);

    expect(await b.fetchEventLogs()).toBe(false);
    expect(b.isLockedByOtherTab()).toBe(true);
    await sleep(200);

    await stopAndWait(a);
    const { rows, unique } = await countLogs(a);
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBe(unique);
  }, 30_000);

  test("tab B resumes from the block that tab A fetched", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await sleep(100);
    const b = await openTab();
    tabs.push(b);
    await sleep(100);
    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);

    expect(await b.fetchEventLogs()).toBe(true);
    await sleep(200);
    await stopAndWait(b);

    const { rows, unique } = await countLogs(a);
    expect(rows).toBe(unique);
  }, 30_000);

  test("works as a single tab without navigator.locks", async () => {
    removeLockManager();
    const a = await openTab();
    tabs.push(a);
    expect(a.isLockedByOtherTab()).toBe(false);

    expect(await a.fetchEventLogs()).toBe(true);
    expect(await waitFor(() => a.storeStatus().isSyncing)).toBe(true);
    await a.stop();
    // No lock to wait for: wait until every contract loop has ended.
    expect(await waitFor(() => !a.isChainSyncing())).toBe(true);
  }, 30_000);

  test("returns false and releases the lock when the reset fails", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const initializeDBSyncStatus =
      await import("@db/db.worker.func.InitializeDBSyncStatus");
    vi.spyOn(
      initializeDBSyncStatus,
      "initializeDBSyncStatusInChain",
    ).mockRejectedValueOnce(new Error("DB error"));

    expect(await a.fetchEventLogs()).toBe(false);
    expect(await isSyncLockHeld()).toBe(false);
    expect(a.storeStatus().isSyncing).toBe(false);

    expect(await a.fetchEventLogs()).toBe(true);
    await sleep(100);
    await stopAndWait(a);
  }, 30_000);

  test("can stop right after fetchEventLogs() resolves", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    // Every contract is already marked as syncing, so the abort reaches all.
    await stopAndWait(a);
  }, 30_000);

  test("waits for another tab that holds the lock briefly", async () => {
    const a = await openTab();
    tabs.push(a);
    // Like another tab's reset after it stops syncing.
    const heldLock = lockManager.request(getSyncLockName(chain.name), () =>
      sleep(200),
    );

    expect(await a.fetchEventLogs()).toBe(true);
    expect(a.isLockedByOtherTab()).toBe(false);
    await heldLock;
    await stopAndWait(a);
  }, 30_000);

  test("does not wait for the lock that the same tab holds", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await sleep(50);

    expect(await a.fetchEventLogs()).toBe(false);
    expect(a.isLockedByOtherTab()).toBe(false);
    await stopAndWait(a);
  }, 30_000);
});
