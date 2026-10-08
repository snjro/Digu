import "fake-indexeddb/auto";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
  type MockInstance,
} from "vitest";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import type { EthersEventLog, SyncStatusContract } from "#db/dbTypes.js";
import { getSyncLockName } from "#db/constants.js";
import type { SyncLockKind } from "./syncLock";
import type {
  DbWorkerMessage,
  TargetFunctionName,
} from "#db/db.worker.types.js";
import {
  installFakeLockManager,
  removeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";

// Two browser tabs: each has its own copy of the modules (stores), and both
// share IndexedDB (fake-indexeddb) and navigator.locks.

// isConnectable false: the RPC cannot be connected when a sync starts.
// providers: the providers that the syncs got.
const rpc = vi.hoisted(() => ({
  isConnectable: true,
  providers: [] as { destroy: Mock }[],
}));
// The number of the timers for the latest block number that are running.
const latestBlockTimers = vi.hoisted(() => ({ running: 0 }));

vi.mock("$app/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$app/env")>()),
  browser: true,
}));
// Runs the Worker jobs in the page, with the modules of the tab being opened.
vi.mock("#db/db.worker.portal.js", () => ({
  startDbWorker: async (message: DbWorkerMessage<TargetFunctionName>) => {
    const { executeTargetFunction } =
      await import("#db/db.worker.executeTargetFunction.js");
    return await executeTargetFunction(
      message.targetFunctionName,
      message.params,
    );
  },
}));

// One log at the first block and at each of the last LOGS_AT_RANGE_END blocks
// of each range, for the first event of each contract. Not one per block: the
// sync doubles the range after each success, and the larger writes slowed a
// stop under load (issue #583). A sync that starts again up to
// LOGS_AT_RANGE_END blocks before the end of the last range still saves a log
// twice.
vi.mock("#utils/utilsEthers.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("#utils/utilsEthers.js")>();
  const LOGS_AT_RANGE_END = 50;
  return {
    ...original,
    getNodeProvider: async () => {
      if (!rpc.isConnectable) return undefined;
      const provider = { destroy: vi.fn() };
      rpc.providers.push(provider);
      return provider;
    },
    getEthersEventLogs: async (
      eventNames: string[],
      _contract: unknown,
      from: number,
      to: number,
    ): Promise<EthersEventLog[]> => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const logs = [];
      const blockNumbers: Set<number> = new Set([from]);
      for (
        let blockNumber = Math.max(from, to - LOGS_AT_RANGE_END + 1);
        blockNumber <= to;
        blockNumber++
      ) {
        blockNumbers.add(blockNumber);
      }
      for (const blockNumber of blockNumbers) {
        const hex = "0x" + blockNumber.toString(16).padStart(64, "0");
        logs.push({
          eventName: eventNames[0],
          args: [],
          blockNumber: blockNumber,
          index: 0,
          removed: false,
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
  startUpdateLatestBlockNumber: async () => {
    latestBlockTimers.running++;
    return () => latestBlockTimers.running--;
  },
}));
// Shorter than the app's 1 s, so that a tab gives up on a held lock sooner.
// Long enough for the reset that another tab does after it stops syncing.
vi.mock("#db/constants.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#db/constants.js")>()),
  SYNC_LOCK_TIMEOUT_MS: 200,
}));
// Quiet: the syncs log tens of thousands of lines, which bury real errors.
vi.mock("#utils/logger.js", () => ({
  customLogger: class {
    static info() {}
    static start() {}
    static finished() {}
    static success() {}
    static fail() {}
    static error() {}
    static fatal() {}
    static warn() {}
    static debug() {}
  },
}));
// Dexie warns each time a test deletes the DBs that a tab still has open.
const consoleWarn = console.warn;
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    if (String(args[0]).startsWith("Another connection wants to delete")) {
      return;
    }
    consoleWarn(...args);
  });
});

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
  for (let i = 0; i < 500; i++) {
    if (await condition()) return true;
    await sleep(10);
  }
  return false;
}

// Stops each opened tab from watching the resets and the sync locks of other
// tabs. Otherwise the tabs of the earlier tests read the DB in the lock after
// a reset or a signal, and the lock is still held when the test ends.
const stopWatchingSyncResetsOfTabs: (() => void)[] = [];

// Opens a tab with initialize(). `beforeWatch` runs just before the tab
// watches the locks.
async function openTab(beforeWatch?: () => Promise<void>) {
  vi.resetModules();
  const { initialize } = await import("../initialization/initialize");
  const syncLock = await import("./syncLock");
  // A spy, not vi.mock(): a mocked module stays the same across
  // vi.resetModules(), so the tabs would share its stores.
  if (beforeWatch) {
    const { watchSyncLocksOfOtherTabs } = syncLock;
    vi.spyOn(syncLock, "watchSyncLocksOfOtherTabs").mockImplementationOnce(
      async () => {
        await beforeWatch();
        await watchSyncLocksOfOtherTabs();
      },
    );
  }
  await initialize();

  const { extractEventContracts } = await import("#utils/utilsEthers.js");
  const contract: Contract = extractEventContracts(version.contracts)[0];
  const { DbEventLogs } = await import("#db/dbEventLogs.js");
  const { fetchEventLogs } = await import("./eventLogs");
  const { resetSyncedData, stopWatchingSyncResets } =
    await import("./syncReset");
  stopWatchingSyncResetsOfTabs.push(
    stopWatchingSyncResets,
    syncLock.stopWatchingSyncLockSignals,
  );
  const { startAbortingInChain } =
    await import("#db/dbEventLogsDataHandlersSyncStatus.js");
  const { syncStatusContract } = await import("./eventLogsContract");
  const { storeSyncStatus } = await import("#stores/storeSyncStatus.js");
  const { storeChainStatus } = await import("#stores/storeChainStatus.js");
  const { storeSyncStoppedReason } =
    await import("#stores/storeSyncStoppedReason.js");
  const { get } = await import("svelte/store");
  const { updateDbItemChainStatus } =
    await import("#db/dbChainStatusDataHandlers.js");
  storeChainStatus.updateState(chain.name, { nodeStatus: "SUCCESS" });
  // Far above every contract, so that no loop catches up and waits for a new
  // block during a test: with the small writes of the mock, a loop fetches
  // millions of blocks per second. Also in the DB, because a tab reloads it
  // when another tab stops syncing.
  await updateDbItemChainStatus(
    chain.name,
    "latestBlockNumber",
    Math.max(
      ...chain.projects.flatMap((targetProject) =>
        targetProject.versions.flatMap((targetVersion) =>
          targetVersion.contracts.map(
            (targetContract) => targetContract.creation.blockNumber,
          ),
        ),
      ),
    ) + 1_000_000_000,
  );
  const db = new DbEventLogs(versionIdentifier);
  return {
    contract,
    db,
    fetchEventLogs: () => fetchEventLogs(chain),
    resetSyncedData: () => resetSyncedData(chain),
    stop: () => startAbortingInChain(chain.name),
    storeStatus: (): SyncStatusContract =>
      syncStatusContract({ ...versionIdentifier, contractName: contract.name }),
    // true while any contract of the chain syncs.
    isChainSyncing: (): boolean => get(storeSyncStatus)[chain.name].isSyncing,
    isLockedByOtherTab: (): boolean =>
      get(syncLock.storeSyncLockedByOtherTab)[chain.name],
    lockedByThisTab: () => get(syncLock.storeSyncLockedByThisTab)[chain.name],
    latestBlockNumber: (): number =>
      get(storeChainStatus)[chain.name].latestBlockNumber,
    syncStoppedReason: () => get(storeSyncStoppedReason)[chain.name],
    // What the syncing tab writes: the block number from the RPC minus the
    // confirmation depth.
    updateLatestBlockNumber: (latestBlockNumber: number) =>
      updateDbItemChainStatus(
        chain.name,
        "latestBlockNumber",
        latestBlockNumber,
      ),
  };
}
type Tab = Awaited<ReturnType<typeof openTab>>;

async function dbStatus(tab: Tab): Promise<SyncStatusContract> {
  return await tab.db.table("SyncStatus").get(tab.contract.name);
}
// The number of logs of countLogs() that the tab's store says are saved.
function savedLogs(tab: Tab): number {
  return tab.storeStatus().events[tab.contract.events.names[0]]!.recordCount;
}
// Waits until the tab's sync has saved more logs than `count`.
async function waitForSavedLogs(tab: Tab, count: number = 0): Promise<void> {
  expect(await waitFor(() => savedLogs(tab) > count)).toBe(true);
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
    rpc.isConnectable = true;
    rpc.providers = [];
    latestBlockTimers.running = 0;
    lockManager = installFakeLockManager();
    const { Dexie } = await import("dexie");
    for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
  });
  // As long as a test: stopAndWait() alone can take more than the default
  // 10 s under load, and a hook that times out leaves the sync running into
  // the next test (issue #583).
  afterEach(async () => {
    for (const stop of stopWatchingSyncResetsOfTabs.splice(0)) stop();
    // Every tab, even after one fails: a tab left syncing would sync into the
    // next test.
    const errors: unknown[] = [];
    for (const tab of tabs) {
      try {
        if (tab.storeStatus().isSyncing) await stopAndWait(tab);
      } catch (error) {
        errors.push(error);
      }
    }
    tabs = [];
    if (errors.length > 0) throw errors[0];
    // A sync left running would write into the next test's DB.
    expect(await isSyncLockHeld()).toBe(false);
    // Without navigator.locks, the sync may still be cleaning up.
    expect(await waitFor(() => isCleanedUp())).toBe(true);
  }, 30_000);
  // Every sync stopped its timer and destroyed its provider.
  function isCleanedUp(): boolean {
    return (
      latestBlockTimers.running === 0 &&
      rpc.providers.every(
        (provider) => provider.destroy.mock.calls.length === 1,
      )
    );
  }

  test("opening tab B keeps tab A's sync status, and A can still stop", async () => {
    const a = await openTab();
    tabs.push(a);
    // Before the fix, fetchEventLogs() resolved only when the sync ended.
    const startedA = a.fetchEventLogs();
    await waitForSavedLogs(a);

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
    await waitForSavedLogs(a);
    const b = await openTab();
    tabs.push(b);

    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
    expect(await a.fetchEventLogs()).toBe(true);
    expect(await waitFor(() => a.storeStatus().isSyncing)).toBe(true);
    // Told by the signal of tab A.
    expect(await waitFor(() => b.isLockedByOtherTab())).toBe(true);
    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
  }, 30_000);

  describe("the signal of a sync lock", () => {
    test("tells tab B, open before tab A syncs, without any action of B", async () => {
      const a = await openTab();
      tabs.push(a);
      const b = await openTab();
      tabs.push(b);
      expect(b.isLockedByOtherTab()).toBe(false);

      expect(await a.fetchEventLogs()).toBe(true);
      expect(await waitFor(() => b.isLockedByOtherTab())).toBe(true);
      // Tab A does not take its own lock for another tab's.
      expect(a.isLockedByOtherTab()).toBe(false);

      await stopAndWait(a);
      expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
      expect(b.storeStatus().syncStateText).toBe("stopped");
    }, 30_000);

    test("tells tab B about a reset of tab A too", async () => {
      const a = await openTab();
      tabs.push(a);
      // Tab A's module instance: opening tab B resets the modules.
      const dbResetSyncedData = await import("#db/dbResetSyncedData.js");
      let finishReset: () => void = () => {};
      vi.spyOn(dbResetSyncedData, "resetDbSyncedData").mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => (finishReset = () => resolve(0))),
      );
      const b = await openTab();
      tabs.push(b);

      const resetting = a.resetSyncedData();
      expect(await waitFor(() => b.isLockedByOtherTab())).toBe(true);
      finishReset();
      const outcome = await resetting;
      expect(outcome.result).toBe("reset");
      await outcome.warpSyncImport;
      expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
    }, 30_000);

    test("is not sent without Web Locks", async () => {
      removeLockManager();
      const a = await openTab();
      tabs.push(a);
      const received: unknown[] = [];
      const other = new BroadcastChannel("Digu_syncLock");
      other.addEventListener("message", (event: MessageEvent) =>
        received.push(event.data),
      );
      expect(await a.fetchEventLogs()).toBe(true);
      expect(await waitFor(() => a.storeStatus().isSyncing)).toBe(true);
      await a.stop();
      // No lock to wait for: wait until every contract loop has ended.
      expect(await waitFor(() => !a.isChainSyncing())).toBe(true);
      await sleep(50);
      other.close();
      expect(received).toEqual([]);
    }, 30_000);

    test("is sent when the lock is taken and when it is released", async () => {
      const a = await openTab();
      tabs.push(a);
      const received: unknown[] = [];
      const other = new BroadcastChannel("Digu_syncLock");
      other.addEventListener("message", (event: MessageEvent) =>
        received.push(event.data),
      );
      expect(await a.fetchEventLogs()).toBe(true);
      expect(await waitFor(() => received.length === 1)).toBe(true);
      await stopAndWait(a);
      expect(await waitFor(() => received.length === 2)).toBe(true);
      other.close();
      // Only that it changed: the lock manager keeps the state.
      expect(received).toEqual([null, null]);
    }, 30_000);
  });

  test("tab B cannot sync while tab A syncs", async () => {
    const a = await openTab();
    tabs.push(a);
    const b = await openTab();
    tabs.push(b);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);

    expect(await b.fetchEventLogs()).toBe(false);
    expect(b.isLockedByOtherTab()).toBe(true);
    // Time for tab B to save logs too, if it synced.
    await sleep(200);

    await stopAndWait(a);
    const { rows, unique } = await countLogs(a);
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBe(unique);
  }, 30_000);

  // The label hides the reason while another tab holds the lock
  // (SyncListChainRpcInputHelperLabel.svelte.test.ts).
  test("keeps the reason why the sync stopped when another tab holds the lock", async () => {
    const a = await openTab();
    tabs.push(a);
    const b = await openTab();
    tabs.push(b);
    rpc.isConnectable = false;
    expect(await b.fetchEventLogs()).toBe(true);
    expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
    expect(b.syncStoppedReason()).toBe("RPC_ERRORS");
    rpc.isConnectable = true;
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);

    expect(await b.fetchEventLogs()).toBe(false);
    expect(b.isLockedByOtherTab()).toBe(true);
    expect(b.syncStoppedReason()).toBe("RPC_ERRORS");
    await stopAndWait(a);
  }, 30_000);

  test("tab B reloads the latest block number after tab A stops", async () => {
    const a = await openTab();
    tabs.push(a);
    const b = await openTab();
    tabs.push(b);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    expect(await b.fetchEventLogs()).toBe(false);
    await a.updateLatestBlockNumber(b.latestBlockNumber() + 100);

    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
    expect(b.latestBlockNumber()).toBe(a.latestBlockNumber());
  }, 30_000);

  test("tab B resumes from the block that tab A fetched", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    const b = await openTab();
    tabs.push(b);
    await waitForSavedLogs(a, savedLogs(a));
    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);

    expect(await b.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(b, savedLogs(a));
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

  test("logs a failed sync without navigator.locks", async () => {
    removeLockManager();
    const a = await openTab();
    tabs.push(a);
    // Same module instances as tab A (openTab() resets modules only at start).
    const updateLatestBlockNumber = await import("./updateLatestBlockNumber");
    vi.spyOn(
      updateLatestBlockNumber,
      "startUpdateLatestBlockNumber",
    ).mockRejectedValueOnce(new Error("DB error"));
    const { customLogger } = await import("#utils/logger.js");
    const spyError = vi.spyOn(customLogger, "error");

    expect(await a.fetchEventLogs()).toBe(true);
    expect(
      await waitFor(() =>
        spyError.mock.calls.some(([message]) => message === "Sync event logs."),
      ),
    ).toBe(true);
    expect(spyError).toHaveBeenCalledWith("Sync event logs.", {
      chainName: chain.name,
      errorObject: new Error("DB error"),
    });
    expect(a.isChainSyncing()).toBe(false);
  }, 30_000);

  test("returns false and releases the lock when the reset fails", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const initializeDBSyncStatus =
      await import("#db/db.worker.func.InitializeDBSyncStatus.js");
    vi.spyOn(
      initializeDBSyncStatus,
      "initializeDBSyncStatusInChain",
    ).mockRejectedValueOnce(new Error("DB error"));

    expect(await a.fetchEventLogs()).toBe(false);
    expect(await isSyncLockHeld()).toBe(false);
    expect(a.storeStatus().isSyncing).toBe(false);
    expect(a.syncStoppedReason()).toBe("UNEXPECTED_ERROR");

    expect(await a.fetchEventLogs()).toBe(true);
    expect(a.syncStoppedReason()).toBeUndefined();
    await waitForSavedLogs(a);
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
    // Like another tab's reset after it stops syncing. Released once tab A
    // waits for it.
    const heldLock = lockManager.request(getSyncLockName(chain.name), () =>
      waitFor(async () => !!(await lockManager.query()).pending?.length),
    );

    expect(await a.fetchEventLogs()).toBe(true);
    expect(a.isLockedByOtherTab()).toBe(false);
    await heldLock;
    await stopAndWait(a);
  }, 30_000);

  test("resets a chain whose syncing tab closed while this tab opened", async () => {
    const a = await openTab();
    tabs.push(a);
    // Tab C was stopping when it held the lock, and is closed before tab B
    // watches the locks.
    let closeTabC: () => void = () => {};
    const heldLock = lockManager.request(
      getSyncLockName(chain.name),
      () => new Promise<void>((resolve) => (closeTabC = resolve)),
    );
    await a.db
      .table("SyncStatus")
      .update(a.contract.name, { isSyncing: true, isAbort: true });

    const b = await openTab(async () => {
      // Same module instances as tab B.
      const { syncStatusContract } = await import("./eventLogsContract");
      expect(
        syncStatusContract({
          ...versionIdentifier,
          contractName: a.contract.name,
        }).syncStateText,
      ).toBe("stopping");
      closeTabC();
      await heldLock;
    });
    tabs.push(b);

    expect(b.isLockedByOtherTab()).toBe(false);
    expect(b.storeStatus().syncStateText).toBe("stopped");
    expect((await dbStatus(b)).isSyncing).toBe(false);
  }, 30_000);

  test("opens the tab even when the startup reset fails", async () => {
    const a = await openTab(async () => {
      // Same module instance as the tab being opened.
      const initializeDBSyncStatus =
        await import("#db/db.worker.func.InitializeDBSyncStatus.js");
      vi.spyOn(
        initializeDBSyncStatus,
        "initializeDBSyncStatusInChain",
      ).mockRejectedValueOnce(new Error("DB error"));
    });
    tabs.push(a);

    expect(await isSyncLockHeld()).toBe(false);
    expect(a.isLockedByOtherTab()).toBe(false);
  }, 30_000);

  test("tab B stops waiting even when its reset after release fails", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    // Not in `tabs`: B's store stays stale, so afterEach must not stop it.
    const b = await openTab();
    expect(b.isLockedByOtherTab()).toBe(true);
    // Same module instances as tab B (openTab() resets modules only at start).
    const initializeDBSyncStatus =
      await import("#db/db.worker.func.InitializeDBSyncStatus.js");
    vi.spyOn(
      initializeDBSyncStatus,
      "initializeDBSyncStatusInChain",
    ).mockRejectedValueOnce(new Error("DB error"));
    const { customLogger } = await import("#utils/logger.js");
    const spyError = vi.spyOn(customLogger, "error");

    await stopAndWait(a);
    expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
    expect(spyError).toHaveBeenCalledWith(
      "Reset sync status after release.",
      expect.objectContaining({ chainName: chain.name }),
    );
    expect(b.storeStatus().syncStateText).toBe("syncing");
  }, 30_000);
  test("logs a failed request to wait for the lock release", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    const request = lockManager.request.bind(lockManager);
    // Only the request that waits for the release has no options.
    vi.spyOn(lockManager, "request").mockImplementation(
      (name, optionsOrCallback, maybeCallback) =>
        typeof optionsOrCallback === "function"
          ? Promise.reject(new Error("lock error"))
          : request(name, optionsOrCallback, maybeCallback),
    );
    let spyError: MockInstance | undefined = undefined;

    // Not in `tabs`: B does not sync, so afterEach must not stop it.
    const b = await openTab(async () => {
      // Tab B's module instance: openTab() resets the modules first.
      const { customLogger } = await import("#utils/logger.js");
      spyError = vi.spyOn(customLogger, "error");
    });
    expect(
      await waitFor(() =>
        spyError!.mock.calls.some(
          ([message]) => message === "Wait for the sync lock release.",
        ),
      ),
    ).toBe(true);
    expect(spyError).toHaveBeenCalledWith("Wait for the sync lock release.", {
      chainName: chain.name,
      errorObject: new Error("lock error"),
    });
    // Otherwise the tab would never wait for the lock again.
    expect(b.isLockedByOtherTab()).toBe(false);
  }, 30_000);

  test("stops and releases the lock when the RPC cannot be connected", async () => {
    const a = await openTab();
    tabs.push(a);
    rpc.isConnectable = false;

    expect(await a.fetchEventLogs()).toBe(true);
    expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
    expect(a.storeStatus().syncStateText).toBe("stopped");
    expect(a.isChainSyncing()).toBe(false);
    expect((await dbStatus(a)).isSyncing).toBe(false);
    expect(a.syncStoppedReason()).toBe("RPC_ERRORS");

    rpc.isConnectable = true;
    expect(await a.fetchEventLogs()).toBe(true);
    expect(a.syncStoppedReason()).toBeUndefined();
    expect(await waitFor(() => a.storeStatus().isSyncing)).toBe(true);
    await stopAndWait(a);
  }, 30_000);

  test("syncs with its own provider while a newer node check is running", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instances as tab A (openTab() resets modules only at start).
    const { storeChainStatus } = await import("#stores/storeChainStatus.js");
    // A newer check of the same RPC has not ended yet.
    storeChainStatus.updateState(chain.name, { nodeStatus: "CONNECTING" });
    const syncStatus = await import("#db/dbEventLogsDataHandlersSyncStatus.js");
    const spyAbort = vi.spyOn(syncStatus, "startAbortingInChain");

    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    expect(spyAbort).not.toHaveBeenCalled();
    await stopAndWait(a);
  }, 30_000);

  test("stops the timer and destroys the provider when the sync ends", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    expect(latestBlockTimers.running).toBe(1);

    await stopAndWait(a);
    expect(a.syncStoppedReason()).toBeUndefined();
    expect(latestBlockTimers.running).toBe(0);
    expect(rpc.providers).toHaveLength(1);
    expect(rpc.providers[0].destroy).toHaveBeenCalledOnce();
  }, 30_000);

  test("stops every contract and releases the lock when a contract fails", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const eventLogsContract = await import("./eventLogsContract");
    vi.spyOn(eventLogsContract, "fetchEventLogsContract").mockRejectedValueOnce(
      new Error("DB error"),
    );

    expect(await a.fetchEventLogs()).toBe(true);
    expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
    // No contract is still syncing when the lock is released.
    expect(a.isChainSyncing()).toBe(false);
    expect(isCleanedUp()).toBe(true);
    expect(a.syncStoppedReason()).toBe("UNEXPECTED_ERROR");
  }, 30_000);

  test("stops every contract when stopping a contract fails", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const syncStatus = await import("#db/dbEventLogsDataHandlersSyncStatus.js");
    vi.spyOn(syncStatus, "stopSyncingInContract").mockRejectedValueOnce(
      new Error("DB error"),
    );

    await a.stop();
    expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
    expect(a.isChainSyncing()).toBe(false);
    expect(isCleanedUp()).toBe(true);
  }, 30_000);

  test("stops every contract when the sync fails before the contracts start", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const updateLatestBlockNumber = await import("./updateLatestBlockNumber");
    vi.spyOn(
      updateLatestBlockNumber,
      "startUpdateLatestBlockNumber",
    ).mockRejectedValueOnce(new Error("DB error"));

    expect(await a.fetchEventLogs()).toBe(true);
    expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
    expect(a.isChainSyncing()).toBe(false);
    expect(isCleanedUp()).toBe(true);
    expect(a.syncStoppedReason()).toBe("UNEXPECTED_ERROR");
  }, 30_000);

  test("waits for the started contracts when the sync fails while starting them", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const eventLogsContract = await import("./eventLogsContract");
    const original = eventLogsContract.fetchEventLogsContract;
    let calls: number = 0;
    let running: number = 0;
    vi.spyOn(eventLogsContract, "fetchEventLogsContract").mockImplementation(
      (...args: Parameters<typeof original>) => {
        calls++;
        // Throws in the loop that starts the contracts, after the first one.
        if (calls === 2) throw new Error("Setup error");
        running++;
        return original(...args).finally(() => running--);
      },
    );

    expect(await a.fetchEventLogs()).toBe(true);
    expect(await waitFor(async () => !(await isSyncLockHeld()))).toBe(true);
    // The first contract has stopped before the lock is released.
    expect(running).toBe(0);
    expect(a.isChainSyncing()).toBe(false);
    expect(isCleanedUp()).toBe(true);
  }, 30_000);

  test("does not wait for the lock that the same tab holds", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);

    expect(await a.fetchEventLogs()).toBe(false);
    expect(a.isLockedByOtherTab()).toBe(false);
    await stopAndWait(a);
  }, 30_000);

  test("does not take the lock of this tab's reset for another tab's", async () => {
    const a = await openTab();
    tabs.push(a);
    // Same module instance as tab A (openTab() resets modules only at start).
    const dbResetSyncedData = await import("#db/dbResetSyncedData.js");
    let finishReset: () => void = () => {};
    vi.spyOn(dbResetSyncedData, "resetDbSyncedData").mockImplementationOnce(
      () => new Promise<number>((resolve) => (finishReset = () => resolve(0))),
    );
    const resetting = a.resetSyncedData();
    expect(await waitFor(isSyncLockHeld)).toBe(true);

    expect(await a.fetchEventLogs()).toBe(false);
    expect(a.isLockedByOtherTab()).toBe(false);
    finishReset();
    const outcome = await resetting;
    expect(outcome.result).toBe("reset");
    await outcome.warpSyncImport;
  }, 30_000);

  test("does not reset while this tab syncs, and does not wait for the lock", async () => {
    const a = await openTab();
    tabs.push(a);
    expect(await a.fetchEventLogs()).toBe(true);
    await waitForSavedLogs(a);
    const request = vi.spyOn(lockManager, "request");

    expect((await a.resetSyncedData()).result).toBe("busy");
    expect(request).not.toHaveBeenCalled();
    expect(a.isLockedByOtherTab()).toBe(false);
    await stopAndWait(a);
  }, 30_000);

  test("does not wait for the lock that the same tab is waiting for", async () => {
    const a = await openTab();
    tabs.push(a);
    let release: () => void = () => {};
    const heldLock = lockManager.request(
      getSyncLockName(chain.name),
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    const startedA = a.fetchEventLogs();
    expect(
      await waitFor(async () => !!(await lockManager.query()).pending?.length),
    ).toBe(true);
    const request = vi.spyOn(lockManager, "request");

    expect(await a.fetchEventLogs()).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(a.isLockedByOtherTab()).toBe(false);
    release();
    await heldLock;
    expect(await startedA).toBe(true);
    await stopAndWait(a);
  }, 30_000);

  describe("runWithSyncLock", () => {
    // Opens a tab, and returns runWithSyncLock() of that tab.
    async function openTabForLock() {
      const a = await openTab();
      tabs.push(a);
      // Same module instance as tab A (openTab() resets modules only at start).
      const { runWithSyncLock } = await import("./syncLock");
      return {
        a,
        runWithSyncLock: (
          run: () => Promise<void>,
          kind: SyncLockKind = "sync",
        ) => runWithSyncLock(chain.name, kind, run),
      };
    }

    test.each<SyncLockKind>(["sync", "import", "reset"])(
      "keeps the %s in the lock record while it waits and runs, and clears it",
      async (kind) => {
        const { a, runWithSyncLock } = await openTabForLock();
        let finish: () => void = () => {};
        const kinds: (SyncLockKind | undefined)[] = [];
        const holding = runWithSyncLock(async () => {
          kinds.push(a.lockedByThisTab());
          await new Promise<void>((resolve) => (finish = resolve));
        }, kind);
        // Before the lock is granted.
        expect(a.lockedByThisTab()).toBe(kind);
        // A second operation is refused, and leaves the record as it is.
        expect(await runWithSyncLock(async () => {}, "reset")).toBe(false);
        expect(a.lockedByThisTab()).toBe(kind);
        expect(await waitFor(() => kinds.length === 1)).toBe(true);
        expect(kinds).toEqual([kind]);
        finish();
        expect(await holding).toBe(true);
        expect(a.lockedByThisTab()).toBeUndefined();
      },
      30_000,
    );

    test("clears the lock record when the run throws or another tab keeps the lock", async () => {
      const { a, runWithSyncLock } = await openTabForLock();
      await expect(
        runWithSyncLock(async () => {
          throw new Error("run error");
        }),
      ).rejects.toThrow("run error");
      expect(a.lockedByThisTab()).toBeUndefined();

      let release: () => void = () => {};
      const heldLock = lockManager.request(
        getSyncLockName(chain.name),
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      expect(await runWithSyncLock(async () => {}, "import")).toBe(false);
      expect(a.lockedByThisTab()).toBeUndefined();
      release();
      await heldLock;
      expect(await waitFor(() => !a.isLockedByOtherTab())).toBe(true);
    }, 30_000);

    test("keeps the sync in the lock record from the request until the sync ends", async () => {
      const { a } = await openTabForLock();
      const fetching: Promise<boolean> = a.fetchEventLogs();
      expect(await waitFor(() => a.lockedByThisTab() === "sync")).toBe(true);
      expect(await fetching).toBe(true);
      expect(a.lockedByThisTab()).toBe("sync");
      await stopAndWait(a);
      expect(a.lockedByThisTab()).toBeUndefined();
    }, 30_000);

    test("returns false at once while this tab holds the lock", async () => {
      const { a, runWithSyncLock } = await openTabForLock();
      let finish: () => void = () => {};
      const holding = runWithSyncLock(
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      const request = vi.spyOn(lockManager, "request");
      const run = vi.fn(async () => {});

      expect(await runWithSyncLock(run)).toBe(false);
      expect(run).not.toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
      expect(a.isLockedByOtherTab()).toBe(false);
      finish();
      expect(await holding).toBe(true);
      expect(await runWithSyncLock(run)).toBe(true);
      expect(run).toHaveBeenCalledOnce();
    }, 30_000);

    test("returns false and waits for another holder that keeps the lock", async () => {
      const { a, runWithSyncLock } = await openTabForLock();
      let release: () => void = () => {};
      const heldLock = lockManager.request(
        getSyncLockName(chain.name),
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      const run = vi.fn(async () => {});

      expect(await runWithSyncLock(run)).toBe(false);
      expect(run).not.toHaveBeenCalled();
      expect(a.isLockedByOtherTab()).toBe(true);
      release();
      await heldLock;
      expect(await waitFor(() => !a.isLockedByOtherTab())).toBe(true);
    }, 30_000);

    test("rejects when the run throws, and is not taken for another tab", async () => {
      const { a, runWithSyncLock } = await openTabForLock();
      const error = new Error("run error");

      await expect(
        runWithSyncLock(async () => {
          throw error;
        }),
      ).rejects.toBe(error);
      expect(a.isLockedByOtherTab()).toBe(false);
      expect(await isSyncLockHeld()).toBe(false);
      expect(await runWithSyncLock(async () => {})).toBe(true);
    }, 30_000);

    test("logs a failed request that is not a timeout as an error", async () => {
      const { a, runWithSyncLock } = await openTabForLock();
      // Tab A's module instance (openTab() resets modules only at start).
      const { customLogger } = await import("#utils/logger.js");
      const spyInfo = vi.spyOn(customLogger, "info");
      const spyError = vi.spyOn(customLogger, "error");
      const error = new Error("lock error");
      vi.spyOn(lockManager, "request").mockRejectedValueOnce(error);
      const run = vi.fn(async () => {});

      expect(await runWithSyncLock(run)).toBe(false);
      expect(run).not.toHaveBeenCalled();
      expect(spyError).toHaveBeenCalledWith("The sync lock was not granted.", {
        chainName: chain.name,
        errorObject: error,
      });
      expect(spyInfo).not.toHaveBeenCalledWith(
        "The sync lock was not granted.",
        expect.anything(),
      );
      // As for a timeout: the stores are read again once the lock is free.
      expect(await waitFor(() => !a.isLockedByOtherTab())).toBe(true);
    }, 30_000);

    test("works without navigator.locks, and still refuses a second run", async () => {
      removeLockManager();
      const { a, runWithSyncLock } = await openTabForLock();
      let finish: () => void = () => {};
      const holding = runWithSyncLock(
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      const run = vi.fn(async () => {});

      expect(await runWithSyncLock(run)).toBe(false);
      expect(run).not.toHaveBeenCalled();
      expect(a.isLockedByOtherTab()).toBe(false);
      finish();
      expect(await holding).toBe(true);
      expect(await runWithSyncLock(run)).toBe(true);
      expect(run).toHaveBeenCalledOnce();
    }, 30_000);
  });

  // Only the startup in the Worker counts the records. The syncing tab adds
  // to the counts in the DB, so they still match the rows.
  describe("record counts", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    // getEventLogTableRecordCount counts with count() of IndexedDB.
    function spyCount() {
      return vi.spyOn(IDBObjectStore.prototype, "count");
    }
    async function expectCountMatchesRows(tab: Tab): Promise<void> {
      const { rows } = await countLogs(tab);
      expect(rows).toBeGreaterThan(0);
      expect(
        tab.storeStatus().events[tab.contract.events.names[0]]!.recordCount,
      ).toBe(rows);
    }

    test("counts only in the Worker at startup", async () => {
      const spy = spyCount();
      let countsInWorker: number = 0;
      const a = await openTab(async () => {
        countsInWorker = spy.mock.calls.length;
        spy.mockClear();
      });
      tabs.push(a);

      expect(countsInWorker).toBeGreaterThan(0);
      expect(spy).not.toHaveBeenCalled();
    }, 30_000);

    test("does not count when a sync starts", async () => {
      const a = await openTab();
      tabs.push(a);
      expect(await a.fetchEventLogs()).toBe(true);
      await waitForSavedLogs(a);
      await stopAndWait(a);
      const saved: number = savedLogs(a);

      const spy = spyCount();
      expect(await a.fetchEventLogs()).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      await waitForSavedLogs(a, saved);
      await stopAndWait(a);
      await expectCountMatchesRows(a);
    }, 30_000);

    test("does not count when another tab releases the lock", async () => {
      const a = await openTab();
      tabs.push(a);
      expect(await a.fetchEventLogs()).toBe(true);
      await waitForSavedLogs(a);
      const b = await openTab();
      tabs.push(b);
      expect(b.isLockedByOtherTab()).toBe(true);

      const spy = spyCount();
      await stopAndWait(a);
      expect(await waitFor(() => !b.isLockedByOtherTab())).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      await expectCountMatchesRows(b);
    }, 30_000);
  });
});
