import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import type { Contract as EthersContract } from "ethers";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
  stopSyncingInContract,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import type {
  ContractIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "#db/dbTypes.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { customLogger } from "#utils/logger.js";
import {
  extractEventContracts,
  getEthersEventLogs,
  getNodeProvider,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { fetchEventLogs } from "./eventLogs";
import { TRY_COUNT } from "./eventLogsContract";
import { requestSyncLock } from "./syncLock";
import { getSyncRunSignal, startSyncRun, stopSync } from "./syncStop";

vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js");
vi.mock("./eventLogsContractUpdateTables");
vi.mock("./syncLock", () => ({ requestSyncLock: vi.fn() }));
vi.mock("./updateLatestBlockNumber", () => ({
  startUpdateLatestBlockNumber: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("#warpSync/warpSync.js", () => ({
  waitForWarpSync: vi.fn(),
  importWarpSyncBeforeSync: vi.fn(),
}));
vi.mock("#utils/utilsEthers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#utils/utilsEthers.js")>()),
  getNodeProvider: vi.fn(),
  getEthersEventLogs: vi.fn(),
}));

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject = targetChain.projects[0];
const targetVersion = targetProject.versions[0];
const [contractA, contractB]: Contract[] = extractEventContracts(
  targetVersion.contracts,
);
const identifierOf = (contract: Contract): ContractIdentifier => ({
  chainName: targetChain.name,
  projectName: targetProject.name,
  versionName: targetVersion.name,
  contractName: contract.name,
});
// Long enough for TRY_COUNT errors in a row at the latest block, each after
// a Block Interval and a retry wait.
const timeToGiveUpMs: number =
  (TRY_COUNT + 3) * (targetChain.blockIntervalMs + 1000);

function contractInState(
  state: SyncStatusesChain,
  contract: Contract,
): SyncStatusContract {
  return state[targetChain.name].subSyncStatuses[targetProject.name]
    .subSyncStatuses[targetVersion.name].subSyncStatuses[contract.name]!;
}

// Starts a sync of contractA and contractB, and returns whether it has
// ended.
async function startSync(): Promise<() => boolean> {
  let ended: boolean = false;
  vi.mocked(requestSyncLock).mockImplementationOnce(
    async (_chainName, start, sync) => {
      await start();
      void sync()
        .catch(() => {})
        .finally(() => (ended = true));
      return true;
    },
  );
  expect(await fetchEventLogs(targetChain)).toBe(true);
  return () => ended;
}

describe("stopSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeSyncStoppedReason.clear(targetChain.name);
  });

  test("aborts the run, records the reason and rejects when the DB write fails", async () => {
    const error: Error = new Error("DB error");
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(error);
    const endSyncRun = startSyncRun(targetChain.name);

    await expect(stopSync(targetChain.name, "RPC_ERRORS")).rejects.toBe(error);
    expect(getSyncRunSignal(targetChain.name)?.aborted).toBe(true);
    expect(get(storeSyncStoppedReason)[targetChain.name]).toBe("RPC_ERRORS");
    endSyncRun();
    expect(getSyncRunSignal(targetChain.name)).toBeUndefined();
  });

  test("keeps no reason after the user has stopped the run", async () => {
    const endSyncRun = startSyncRun(targetChain.name);

    await stopSync(targetChain.name);
    await stopSync(targetChain.name, "RPC_ERRORS");
    expect(get(storeSyncStoppedReason)[targetChain.name]).toBeUndefined();
    endSyncRun();
  });

  test("leaves the next run not aborted", async () => {
    vi.mocked(startAbortingInChain).mockRejectedValueOnce(new Error("DB"));
    const endFirstRun = startSyncRun(targetChain.name);
    await stopSync(targetChain.name).catch(() => {});
    endFirstRun();

    const endSecondRun = startSyncRun(targetChain.name);
    expect(getSyncRunSignal(targetChain.name)?.aborted).toBe(false);
    endSecondRun();
  });
});

describe("a stop when isAbort cannot be written to the DB", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.spyOn(customLogger, "fatal").mockImplementation(() => {});
    for (const method of ["start", "info", "success"] as const) {
      vi.spyOn(customLogger, method).mockImplementation(() => {});
    }
    // Both contracts reach the latest block, and sleep before each request.
    // The latest block number is only raised.
    const latestBlockNumber: number =
      Math.max(
        get(storeChainStatus)[targetChain.name].latestBlockNumber,
        contractA.creation.blockNumber,
        contractB.creation.blockNumber,
      ) + 10;
    storeChainStatus.updateState(targetChain.name, { latestBlockNumber });
    storeSyncStatus.update((state: SyncStatusesChain) => {
      for (const contract of [contractA, contractB]) {
        Object.assign(contractInState(state, contract), {
          isSyncTarget: true,
          isSyncing: true,
          isAbort: false,
          fetchedBlockNumber: latestBlockNumber - 5,
        });
      }
      state[targetChain.name].isAbort = false;
      return state;
    });
    storeSyncStoppedReason.clear(targetChain.name);
    vi.mocked(startSyncingInChain).mockResolvedValue(
      [contractA, contractB].map(identifierOf),
    );
    vi.mocked(getNodeProvider).mockResolvedValue({
      destroy: vi.fn(),
    } as unknown as NodeProvider);
    vi.mocked(getEthersEventLogs).mockResolvedValue([]);
    // The DB cannot be written.
    vi.mocked(startAbortingInChain).mockRejectedValue(new Error("DB error"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("ends the loops of the chain when the user stops it", async () => {
    const hasEnded = await startSync();
    await vi.advanceTimersByTimeAsync(targetChain.blockIntervalMs * 2);
    expect(hasEnded()).toBe(false);

    await expect(stopSync(targetChain.name)).rejects.toThrow("DB error");
    await vi.advanceTimersByTimeAsync(targetChain.blockIntervalMs * 2);

    expect(hasEnded()).toBe(true);
    expect(stopSyncingInContract).toHaveBeenCalledTimes(2);
    expect(stopSyncingInChain).toHaveBeenCalledWith(targetChain.name);
  });

  test("ends the loops of the chain when the errors of one contract exceed Try Count", async () => {
    // contractA fails each time, and contractB goes on.
    vi.mocked(getEthersEventLogs).mockImplementation(
      async (_names: string[], ethersContract: EthersContract) => {
        if (ethersContract.target === contractA.address) {
          throw new Error("RPC error");
        }
        return [];
      },
    );
    const hasEnded = await startSync();
    await vi.advanceTimersByTimeAsync(timeToGiveUpMs);

    expect(startAbortingInChain).toHaveBeenCalled();
    expect(hasEnded()).toBe(true);
    expect(get(storeSyncStoppedReason)[targetChain.name]).toBe("RPC_ERRORS");
  });

  test("does not stop the next sync at once", async () => {
    // The writes that end the run fail too.
    vi.mocked(stopSyncingInContract).mockRejectedValue(new Error("DB error"));
    vi.mocked(stopSyncingInChain).mockRejectedValue(new Error("DB error"));
    const hasFirstEnded = await startSync();
    await stopSync(targetChain.name).catch(() => {});
    await vi.advanceTimersByTimeAsync(targetChain.blockIntervalMs * 2);
    expect(hasFirstEnded()).toBe(true);

    vi.mocked(getEthersEventLogs).mockClear();
    const hasSecondEnded = await startSync();
    await vi.advanceTimersByTimeAsync(targetChain.blockIntervalMs * 3);

    expect(hasSecondEnded()).toBe(false);
    // Both contracts go on fetching.
    const targets = vi
      .mocked(getEthersEventLogs)
      .mock.calls.map(([, ethersContract]) => ethersContract.target);
    expect(new Set(targets)).toEqual(
      new Set([contractA.address, contractB.address]),
    );

    // End the second run.
    await stopSync(targetChain.name).catch(() => {});
    await vi.advanceTimersByTimeAsync(targetChain.blockIntervalMs * 2);
    expect(hasSecondEnded()).toBe(true);
  });
});
