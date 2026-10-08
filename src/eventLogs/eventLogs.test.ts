import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import {
  LOGGABLE_ETHERS_ERROR,
  makeEthersErrorWithRpcUrl,
} from "#utils/testCommon.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import type { DbEventLogs } from "#db/dbEventLogs.js";
import type { SyncStatusesChain } from "#db/dbTypes.js";
import { abortChainWithReason } from "./syncStoppedReason";
import { customLogger } from "#utils/logger.js";
import { getNodeProvider, type NodeProvider } from "#utils/utilsEthers.js";
import { fetchEventLogsContract } from "./eventLogsContract";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
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
vi.mock("./eventLogsContract", () => ({
  fetchEventLogsContract: vi.fn(),
}));

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

describe("fetchEventLogs stops the chain by itself", () => {
  const matic: Chain = TARGET_CHAINS.find((chain) => chain.name === "matic")!;
  const nodeProvider = { destroy: vi.fn() } as unknown as NodeProvider;
  let spyLogs: Record<"error" | "fail", ReturnType<typeof vi.spyOn>>;
  // The error that the sync throws, or undefined. The lock resolves once
  // started, and then catches it.
  let syncing: Promise<unknown>;
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(getNodeProvider).mockResolvedValue(nodeProvider);
    vi.mocked(startUpdateLatestBlockNumber).mockResolvedValue(() => {});
    vi.mocked(fetchEventLogsContract).mockResolvedValue();
    spyLogs = {
      error: vi.spyOn(customLogger, "error").mockImplementation(() => {}),
      fail: vi.spyOn(customLogger, "fail").mockImplementation(() => {}),
    };
  });
  afterEach(() => {
    // Also the values queued on the mocks of the modules.
    vi.resetAllMocks();
    vi.restoreAllMocks();
    storeSyncStoppedReason.clear("matic");
  });

  test("when it cannot get a provider", async () => {
    vi.mocked(getNodeProvider).mockResolvedValue(undefined);

    expect(await fetchEventLogs(matic)).toBe(true);
    expect(await syncing).toBeUndefined();

    expect(spyLogs.fail).toHaveBeenCalledExactlyOnceWith(
      "Get provider.",
      expect.objectContaining({ chainName: "matic", reason: "RPC_ERRORS" }),
    );
    expect(get(storeSyncStoppedReason).matic).toBe("RPC_ERRORS");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(fetchEventLogsContract).not.toHaveBeenCalled();
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });

  test("when an error comes before the contracts start", async () => {
    const error: Error = new Error("unexpected");
    vi.mocked(startUpdateLatestBlockNumber).mockRejectedValue(error);

    expect(await fetchEventLogs(matic)).toBe(true);
    // Thrown again, for the lock.
    expect(await syncing).toBe(error);

    expect(spyLogs.error).toHaveBeenCalledWith(
      "Fetch event logs. Stop syncing the chain after an error.",
      {
        chainName: "matic",
        reason: "UNEXPECTED_ERROR",
        error: { name: "Error", message: "unexpected", stack: error.stack },
      },
    );
    expect(get(storeSyncStoppedReason).matic).toBe("UNEXPECTED_ERROR");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });

  test("when a contract ends with an error", async () => {
    vi.mocked(fetchEventLogsContract).mockRejectedValueOnce(
      makeEthersErrorWithRpcUrl(),
    );

    expect(await fetchEventLogs(matic)).toBe(true);
    expect(await syncing).toBeUndefined();

    // Without the request URL of the ethers error.
    expect(spyLogs.error).toHaveBeenCalledExactlyOnceWith(
      "Fetch event logs. Stop syncing the chain:",
      {
        chainName: "matic",
        reason: "UNEXPECTED_ERROR",
        contractName: expect.any(String),
        error: LOGGABLE_ETHERS_ERROR,
      },
    );
    expect(get(storeSyncStoppedReason).matic).toBe("UNEXPECTED_ERROR");
    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(stopSyncingInChain).toHaveBeenCalledWith("matic");
  });

  describe("when the abort of the chain fails twice", () => {
    // Every contract of the chain in the store, through updateState, which
    // also sets the flags of the chain.
    function setContractsOfMatic(fields: {
      isSyncing: boolean;
      isAbort: boolean;
    }): void {
      const state: SyncStatusesChain = get(storeSyncStatus);
      for (const [projectName, project] of Object.entries(
        state.matic.subSyncStatuses,
      )) {
        for (const [versionName, version] of Object.entries(
          project.subSyncStatuses,
        )) {
          for (const contractName of Object.keys(version.subSyncStatuses)) {
            storeSyncStatus.updateState(
              { chainName: "matic", projectName, versionName, contractName },
              fields,
            );
          }
        }
      }
    }
    // Like the loop of a contract, which ends once its row is aborting.
    function untilAborted(
      dbEventLogs: DbEventLogs,
      contract: Contract,
    ): Promise<void> {
      const { projectName, versionName } = dbEventLogs.versionIdentifier;
      return new Promise((resolve) => {
        const unsubscribe = storeSyncStatus.subscribe(
          (state: SyncStatusesChain) => {
            if (
              state.matic.subSyncStatuses[projectName].subSyncStatuses[
                versionName
              ].subSyncStatuses[contract.name]?.isAbort
            ) {
              queueMicrotask(() => unsubscribe());
              resolve();
            }
          },
        );
      });
    }
    beforeEach(() => {
      setContractsOfMatic({ isSyncing: true, isAbort: false });
    });
    afterEach(() => {
      setContractsOfMatic({ isSyncing: false, isAbort: false });
    });

    test("ends the sync of the chain and keeps the first reason", async () => {
      vi.mocked(startAbortingInChain).mockRejectedValue(new Error("DB error"));
      // The first contract gives up after too many errors, as the contract
      // does, and the others go on until the chain is aborting.
      vi.mocked(fetchEventLogsContract)
        .mockImplementationOnce(async () => {
          const result = await abortChainWithReason(
            "matic",
            "RPC_ERRORS",
            "Too many errors.",
            { logAbortError: false },
          );
          if (!result.aborted) {
            throw new Error("Failed to start aborting.", {
              cause: result.error,
            });
          }
        })
        .mockImplementation(async (dbEventLogs, contract) =>
          untilAborted(dbEventLogs, contract),
        );

      expect(await fetchEventLogs(matic)).toBe(true);
      expect(await syncing).toBeUndefined();

      expect(startAbortingInChain).toHaveBeenCalledTimes(2);
      expect(get(storeSyncStoppedReason).matic).toBe("RPC_ERRORS");
      expect(stopSyncingInChain).toHaveBeenCalledExactlyOnceWith("matic");
    });
  });
});
