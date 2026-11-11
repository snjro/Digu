import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { JsonRpcProvider } from "ethers";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import {
  fetchAndRaiseLatestBlockNumber,
  getEthersEventLogs,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { sleep } from "#utils/utilsCommon.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { addInitialDataOfDbChainStatus } from "#db/dbChainStatus.js";
import { getDbRecordChainStatus } from "#db/dbChainStatusDataHandlers.js";
import type { SyncStatusesChain } from "#db/dbTypes.js";
import {
  contractInState,
  dbEventLogs,
  targetChain,
  targetContract,
} from "../testUtils/syncTarget";

vi.mock("#utils/utilsEthers.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("#utils/utilsEthers.js")>();
  return { ...original, getEthersEventLogs: vi.fn().mockResolvedValue([]) };
});
vi.mock("#utils/utilsCommon.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("#utils/utilsCommon.js")>();
  return { ...original, sleep: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("./eventLogsContractUpdateTables");
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js");

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
    await fetchAndRaiseLatestBlockNumber(nodeProvider, targetChain.name);

    expect(get(storeChainStatus)[targetChain.name].latestBlockNumber).toBe(
      confirmedBlockNumber,
    );
    expect(
      (await getDbRecordChainStatus(targetChain.name)).latestBlockNumber,
    ).toBe(confirmedBlockNumber);
  });

  test("should not mark blocks within the confirmation depth as fetched", async () => {
    await fetchAndRaiseLatestBlockNumber(nodeProvider, targetChain.name);

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
