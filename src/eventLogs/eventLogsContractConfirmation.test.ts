import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { JsonRpcProvider } from "ethers";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import {
  extractEventContracts,
  getAndUpdateLatestBlockNumber,
  getEthersEventLogs,
  type NodeProvider,
} from "@utils/utilsEthers";
import { sleep } from "@utils/utilsCommon";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import { addInitialDataOfDbChainStatus } from "@db/dbChainStatus";
import { getDbRecordChainStatus } from "@db/dbChainStatusDataHandlers";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";

vi.mock("@utils/utilsEthers", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsEthers")>();
  return { ...original, getEthersEventLogs: vi.fn().mockResolvedValue([]) };
});
vi.mock("@utils/utilsCommon", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/utilsCommon")>();
  return { ...original, sleep: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("./eventLogsContractUpdateTables");
vi.mock("@db/dbEventLogsDataHandlersSyncStatus");

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject = targetChain.projects[0];
const targetVersion = targetProject.versions[0];
const targetContract: Contract = extractEventContracts(
  targetVersion.contracts,
)[0];
const dbEventLogs = {
  versionIdentifier: {
    chainName: targetChain.name,
    projectName: targetProject.name,
    versionName: targetVersion.name,
  },
} as DbEventLogs;

function contractInState(state: SyncStatusesChain): SyncStatusContract {
  return state[targetChain.name].subSyncStatuses[targetProject.name]
    .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name]!;
}

describe("fetchEventLogsContract with the latest block number from the RPC", () => {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  const rpcLatestBlockNumber: number = creationBlockNumber + 1000;
  const confirmedBlockNumber: number =
    rpcLatestBlockNumber - targetChain.confirmationBlocks;
  const nodeProvider: NodeProvider = new JsonRpcProvider();

  beforeAll(async () => {
    await addInitialDataOfDbChainStatus();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(nodeProvider, "getBlockNumber").mockResolvedValue(
      rpcLatestBlockNumber,
    );
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      return state;
    });
    storeRpcSettings.updateState(targetChain.name, { bulkUnit: 100 });
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(
      async (_dbEventLogs, _targetContract, _nodeProvider, _logs, to) => {
        storeSyncStatus.update((state: SyncStatusesChain) => {
          contractInState(state).fetchedBlockNumber = to;
          return state;
        });
      },
    );
    // The second wait is after the last block is fetched. Abort there so that
    // the loop ends. Reset first: clearAllMocks keeps the Once implementations
    // that a test did not use.
    vi.mocked(sleep)
      .mockReset()
      .mockResolvedValue(undefined)
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(async () => {
        storeSyncStatus.update((state: SyncStatusesChain) => {
          contractInState(state).isAbort = true;
          return state;
        });
      });
  });

  test("should keep the confirmation depth in the store and in the DB", async () => {
    await getAndUpdateLatestBlockNumber(nodeProvider, targetChain.name);

    expect(get(storeChainStatus)[targetChain.name].latestBlockNumber).toBe(
      confirmedBlockNumber,
    );
    expect(
      (await getDbRecordChainStatus(targetChain.name)).latestBlockNumber,
    ).toBe(confirmedBlockNumber);
  });

  test("should not mark blocks within the confirmation depth as fetched", async () => {
    await getAndUpdateLatestBlockNumber(nodeProvider, targetChain.name);

    await fetchEventLogsContract(dbEventLogs, targetContract, nodeProvider);

    const fetchedToBlocks: number[] = vi
      .mocked(getEthersEventLogs)
      .mock.calls.map(([, , , toBlock]) => toBlock);
    expect(Math.max(...fetchedToBlocks)).toBe(confirmedBlockNumber);
    expect(contractInState(get(storeSyncStatus)).fetchedBlockNumber).toBe(
      confirmedBlockNumber,
    );
  });
});
