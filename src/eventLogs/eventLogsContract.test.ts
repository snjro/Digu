import { beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { getEthersEventLogs, type NodeProvider } from "@utils/utilsEthers";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeRpcSettings } from "@stores/storeRpcSettings";
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
  ];
}

describe("fetchEventLogsContract", () => {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  const bulkUnit: number = 100;

  beforeEach(() => {
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      return state;
    });
    storeRpcSettings.updateState(targetChain.name, { bulkUnit });
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 10 * bulkUnit,
    });
  });

  test("should fetch the next blocks after the store value is replaced", async () => {
    // Register the fetched block number by replacing the store value with a
    // new object, and abort after the third registration.
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

    await fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      null as unknown as NodeProvider,
    );

    expect(
      vi
        .mocked(getEthersEventLogs)
        .mock.calls.map(([, , fromBlock, toBlock]) => [fromBlock, toBlock]),
    ).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber + bulkUnit, creationBlockNumber + 2 * bulkUnit - 1],
      [
        creationBlockNumber + 2 * bulkUnit,
        creationBlockNumber + 3 * bulkUnit - 1,
      ],
    ]);
  });
});
