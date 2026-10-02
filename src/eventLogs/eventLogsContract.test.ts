import { beforeEach, describe, expect, onTestFinished, test, vi } from "vitest";
import { get } from "svelte/store";
import {
  fetchEventLogsContract,
  INITIAL_BULK_UNIT,
  TRY_COUNT,
} from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { getEthersEventLogs, type NodeProvider } from "@utils/utilsEthers";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { customLogger } from "@utils/logger";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { extractEventContracts } from "@utils/utilsEthers";
import type { Chain, Contract } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import type {
  ContractIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";

vi.mock("@utils/utilsEthers", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsEthers")>();
  return { ...original, getEthersEventLogs: vi.fn().mockResolvedValue([]) };
});
vi.mock("./eventLogsContractUpdateTables");
vi.mock("@db/dbEventLogsDataHandlersSyncStatus");

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
