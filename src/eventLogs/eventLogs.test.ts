import { afterEach, describe, expect, test, vi } from "vitest";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain } from "#constants/chains/types.js";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { customLogger } from "#utils/logger.js";
import { getNodeProvider, type NodeProvider } from "#utils/utilsEthers.js";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import { fetchEventLogsContract } from "./eventLogsContract";
import { extractEventContracts } from "#utils/utilsEthers.js";
import {
  importWarpSyncBeforeSync,
  waitForWarpSync,
} from "#warpSync/warpSync.js";
import { fetchEventLogs } from "./eventLogs";
import { requestSyncLock } from "./syncLock";

vi.mock("./syncLock", () => ({ requestSyncLock: vi.fn() }));
vi.mock("#warpSync/warpSync.js", () => ({
  waitForWarpSync: vi.fn(),
  importWarpSyncBeforeSync: vi.fn(),
}));
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js", () => ({
  startSyncingInChain: vi.fn(),
  startAbortingInChain: vi.fn(),
  stopSyncingInChain: vi.fn(),
}));
vi.mock("#utils/utilsEthers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#utils/utilsEthers.js")>()),
  getNodeProvider: vi.fn(),
}));
vi.mock("./updateLatestBlockNumber", () => ({
  startUpdateLatestBlockNumber: vi.fn(),
}));
vi.mock("./eventLogsContract", () => ({ fetchEventLogsContract: vi.fn() }));

const chain = { name: "matic" } as Chain;

describe("fetchEventLogs", () => {
  test("waits for the warp sync of this tab, then imports the rest under the lock before the sync starts", async () => {
    const calls: string[] = [];
    vi.mocked(waitForWarpSync).mockImplementation(async () => {
      calls.push("wait for the import of this tab");
    });
    vi.mocked(importWarpSyncBeforeSync).mockImplementation(async () => {
      calls.push("import");
    });
    vi.mocked(startSyncingInChain).mockImplementation(async () => {
      calls.push("start syncing");
      return [];
    });
    vi.mocked(requestSyncLock).mockImplementation(async (chainName, start) => {
      calls.push(`lock ${chainName}`);
      await start();
      return true;
    });

    expect(await fetchEventLogs(chain)).toBe(true);
    expect(calls).toEqual([
      "wait for the import of this tab",
      "lock matic",
      "import",
      "start syncing",
    ]);
    expect(importWarpSyncBeforeSync).toHaveBeenCalledWith(chain);
    expect(startSyncingInChain).toHaveBeenCalledWith("matic");
  });
});

describe("syncEventLogs", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
    storeSyncStoppedReason.clear("matic");
  });

  test("throws the error of the sync when destroying the provider fails too", async () => {
    const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
    const syncError: Error = new Error("sync error");
    const destroy = vi.fn().mockRejectedValue(new Error("destroy error"));
    vi.mocked(getNodeProvider).mockResolvedValue({
      destroy,
    } as unknown as NodeProvider);
    vi.mocked(startUpdateLatestBlockNumber).mockRejectedValue(syncError);
    vi.mocked(startAbortingInChain).mockResolvedValue();
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    // The error that the sync throws to the lock.
    let syncing: Promise<unknown> = Promise.resolve();
    vi.mocked(requestSyncLock).mockImplementation(
      async (_chainName, start, sync) => {
        await start();
        syncing = sync().then(
          () => undefined,
          (error: unknown) => error,
        );
        return true;
      },
    );

    expect(await fetchEventLogs(matic)).toBe(true);
    expect(await syncing).toBe(syncError);
    expect(destroy).toHaveBeenCalledOnce();
    expect(spyError).toHaveBeenCalledWith("nodeProvider.destroy().", {
      name: "Error",
    });
  });

  test("starts the loops of the contracts that the start marked as syncing only", async () => {
    const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
    const version = matic.projects[0].versions[0];
    const [marked, other] = extractEventContracts(version.contracts);
    // Both are sync targets in the store of this tab; another tab took the
    // other one out of the sync target in the DB.
    expect(other).toBeDefined();
    vi.mocked(startSyncingInChain).mockResolvedValue([
      {
        chainName: matic.name,
        projectName: matic.projects[0].name,
        versionName: version.name,
        contractName: marked.name,
      },
    ]);
    vi.mocked(getNodeProvider).mockResolvedValue({
      destroy: vi.fn(),
    } as unknown as NodeProvider);
    vi.mocked(startUpdateLatestBlockNumber).mockResolvedValue(() => {});
    vi.mocked(fetchEventLogsContract).mockResolvedValue();
    let syncing: Promise<void> = Promise.resolve();
    vi.mocked(requestSyncLock).mockImplementation(
      async (_chainName, start, sync) => {
        await start();
        syncing = sync();
        return true;
      },
    );

    expect(await fetchEventLogs(matic)).toBe(true);
    await syncing;

    expect(
      vi
        .mocked(fetchEventLogsContract)
        .mock.calls.map(([, contract]) => contract.name),
    ).toEqual([marked.name]);
    // The run ends with the loops that the abort reaches.
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });
});
