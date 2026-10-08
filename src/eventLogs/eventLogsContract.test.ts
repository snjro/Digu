import { beforeEach, describe, expect, onTestFinished, test, vi } from "vitest";
import { get } from "svelte/store";
import {
  fetchEventLogsContract,
  INITIAL_BULK_UNIT,
  TRY_COUNT,
} from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { getEthersEventLogs, type NodeProvider } from "#utils/utilsEthers.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { customLogger } from "#utils/logger.js";
import { stopSyncingInContract } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import type { DbEventLogs } from "#db/dbEventLogs.js";
import type {
  ContractIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "#db/dbTypes.js";

vi.mock("#utils/utilsEthers.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("#utils/utilsEthers.js")>();
  return { ...original, getEthersEventLogs: vi.fn().mockResolvedValue([]) };
});
vi.mock("./eventLogsContractUpdateTables");
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js");

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject = targetChain.projects[0];
const targetVersion = targetProject.versions[0];
const targetContract: Contract = extractEventContracts(
  targetVersion.contracts,
)[0];
const contractIdentifier: ContractIdentifier = {
  chainName: targetChain.name,
  projectName: targetProject.name,
  versionName: targetVersion.name,
  contractName: targetContract.name,
};
const dbEventLogs = {
  versionIdentifier: {
    chainName: targetChain.name,
    projectName: targetProject.name,
    versionName: targetVersion.name,
  },
} as DbEventLogs;

function contractInState(state: SyncStatusesChain): SyncStatusContract {
  return state[contractIdentifier.chainName].subSyncStatuses[
    contractIdentifier.projectName
  ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
    contractIdentifier.contractName
  ]!;
}

describe("fetchEventLogsContract", () => {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  const bulkUnit: number = INITIAL_BULK_UNIT;

  beforeEach(() => {
    vi.clearAllMocks();
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isSyncing: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      return state;
    });
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 10 * bulkUnit,
    });
  });

  // Register the fetched block number by replacing the store value with a new
  // object, and abort after the third registration.
  function registerAndAbortAfterThird(): void {
    let registerCount: number = 0;
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(
      async (_dbEventLogs, _targetContract, _nodeProvider, _logs, to) => {
        registerCount++;
        storeSyncStatus.set(
          ((state: SyncStatusesChain) => {
            const newState: SyncStatusesChain = structuredClone(state);
            contractInState(newState).fetchedBlockNumber = to;
            contractInState(newState).isAbort = registerCount >= 3;
            return newState;
          })(get(storeSyncStatus)),
        );
      },
    );
  }
  function fetchedRanges(): number[][] {
    return vi
      .mocked(getEthersEventLogs)
      .mock.calls.map(([, , fromBlock, toBlock]) => [fromBlock, toBlock]);
  }

  // Another tab took the contract out of the sync target before this tab
  // started: the start did not mark it as syncing, and the abort would not
  // reach its loop.
  test("should not start the loop of a contract that the start did not mark as syncing", async () => {
    storeSyncStatus.update((state: SyncStatusesChain) => {
      contractInState(state).isSyncing = false;
      return state;
    });

    await fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      null as unknown as NodeProvider,
    );

    expect(getEthersEventLogs).not.toHaveBeenCalled();
  });

  test("should fetch the next blocks after the store value is replaced", async () => {
    registerAndAbortAfterThird();

    await fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      null as unknown as NodeProvider,
    );

    // The range is doubled after each success.
    expect(fetchedRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber + bulkUnit, creationBlockNumber + 3 * bulkUnit - 1],
      [
        creationBlockNumber + 3 * bulkUnit,
        creationBlockNumber + 7 * bulkUnit - 1,
      ],
    ]);
  });

  test("should stop without saving the range when stopped while it fetches", async () => {
    // clearAllMocks in beforeEach keeps the implementation.
    onTestFinished(() => {
      vi.mocked(registerEventLogsAndBlockTimes).mockReset();
    });
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(
      async (_dbEventLogs, _targetContract, _nodeProvider, _logs, to) => {
        storeSyncStatus.update((state: SyncStatusesChain) => {
          contractInState(state).fetchedBlockNumber = to;
          return state;
        });
      },
    );
    vi.mocked(getEthersEventLogs).mockImplementationOnce(async () => {
      storeSyncStatus.update((state: SyncStatusesChain) => {
        contractInState(state).isAbort = true;
        return state;
      });
      return [];
    });

    await fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      null as unknown as NodeProvider,
    );

    expect(fetchedRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
    ]);
    expect(registerEventLogsAndBlockTimes).not.toHaveBeenCalled();
    // The next start fetches the range again.
    expect(contractInState(get(storeSyncStatus)).fetchedBlockNumber).toBe(
      creationBlockNumber,
    );
    expect(stopSyncingInContract).toHaveBeenCalledExactlyOnceWith(
      dbEventLogs,
      targetContract.name,
    );
  });

  test("should move past the creation block when Bulk Unit is halved to 1", async () => {
    // Errors in a row halve Bulk Unit from the second one.
    let errorCount: number = 1;
    for (let width = bulkUnit; width > 1; width = Math.floor(width / 2)) {
      errorCount++;
    }
    expect(errorCount).toBeLessThanOrEqual(TRY_COUNT);
    for (let i = 0; i < errorCount; i++) {
      vi.mocked(getEthersEventLogs).mockRejectedValueOnce(new Error("rpc"));
    }
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    registerAndAbortAfterThird();

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      null as unknown as NodeProvider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The creation block is not marked as fetched until a later block is.
    // The range is not widened beyond the halved width.
    expect(fetchedRanges().slice(errorCount)).toEqual([
      [creationBlockNumber, creationBlockNumber + 1],
      [creationBlockNumber + 2, creationBlockNumber + 2],
      [creationBlockNumber + 3, creationBlockNumber + 3],
    ]);
  });
});
