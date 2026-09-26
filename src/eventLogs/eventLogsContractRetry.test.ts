import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { JsonRpcProvider, Network } from "ethers";
import type { JsonRpcPayload, JsonRpcResult } from "ethers";
import { fetchEventLogsContract } from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import { customLogger } from "@utils/logger";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import type { DbEventLogs } from "@db/dbEventLogs";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";

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
function abort(): void {
  storeSyncStatus.update((state: SyncStatusesChain) => {
    contractInState(state).isAbort = true;
    return state;
  });
}

// A real ethers provider, so that its request cache is used, with an RPC
// that fails the first eth_getLogs requests.
function providerFailingGetLogs(failCount: number): {
  provider: JsonRpcProvider;
  getLogsCount: () => number;
  // [fromBlock, toBlock] of each eth_getLogs request.
  getLogsRanges: () => number[][];
} {
  const network: Network = Network.from(targetChain.chainId);
  const provider = new JsonRpcProvider("http://fake-rpc.invalid/", network, {
    staticNetwork: network,
    batchMaxSize: 1,
  });
  let getLogsCount: number = 0;
  const getLogsRanges: number[][] = [];
  vi.spyOn(provider, "_send").mockImplementation(
    async (
      payload: JsonRpcPayload | JsonRpcPayload[],
    ): Promise<JsonRpcResult[]> => {
      return [payload].flat().map((request: JsonRpcPayload) => {
        if (request.method !== "eth_getLogs") {
          throw new Error(`unexpected method: ${request.method}`);
        }
        getLogsCount++;
        const { fromBlock, toBlock } = (
          request.params as [{ fromBlock: string; toBlock: string }]
        )[0];
        getLogsRanges.push([Number(fromBlock), Number(toBlock)]);
        return getLogsCount <= failCount
          ? ({
              id: request.id,
              error: { code: -32000, message: "temporary error" },
            } as unknown as JsonRpcResult)
          : { id: request.id, result: [] };
      });
    },
  );
  return {
    provider,
    getLogsCount: () => getLogsCount,
    getLogsRanges: () => getLogsRanges,
  };
}

describe("fetchEventLogsContract", () => {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  const bulkUnit: number = 100;
  const tryCount: number = 2;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      return state;
    });
    // The smallest Block Interval, which is shorter than the cache of ethers.
    storeRpcSettings.updateState(targetChain.name, {
      bulkUnit,
      tryCount,
      blockIntervalMs: 1,
    });
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 10 * bulkUnit,
    });
    // End the loop after the first registration or when giving up.
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(async () =>
      abort(),
    );
    vi.mocked(startAbortingInChain).mockImplementation(async () => abort());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("should request eth_getLogs again after an error and continue", async () => {
    const { provider, getLogsCount } = providerFailingGetLogs(tryCount);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(startAbortingInChain).not.toHaveBeenCalled();
    expect(registerEventLogsAndBlockTimes).toHaveBeenCalledOnce();
    expect(getLogsCount()).toBe(tryCount + targetContract.events.names.length);
  });

  test("should abort the chain when the errors exceed Try Count", async () => {
    const { provider, getLogsCount } = providerFailingGetLogs(tryCount + 1);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(startAbortingInChain).toHaveBeenCalledExactlyOnceWith(
      targetChain.name,
    );
    expect(registerEventLogsAndBlockTimes).not.toHaveBeenCalled();
    expect(getLogsCount()).toBe(tryCount + 1);
  });

  test("should log an ethers error without the request URL, with the error that the RPC returned", async () => {
    const { provider } = providerFailingGetLogs(1);
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(spyError).toHaveBeenCalledExactlyOnceWith(
      "Fetch eventLogs. Error occurred:",
      expect.objectContaining({
        errorObject: {
          code: "UNKNOWN_ERROR",
          shortMessage: "could not coalesce error",
          rpcError: { code: -32000, message: "temporary error" },
        },
      }),
    );
  });

  test("should halve the range after an error and return to Bulk Unit after a success", async () => {
    const { provider, getLogsRanges } = providerFailingGetLogs(1);
    // Register the fetched block number, and abort after the second
    // registration.
    let registerCount: number = 0;
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(
      async (_dbEventLogs, _targetContract, _nodeProvider, _logs, to) => {
        registerCount++;
        storeSyncStatus.update((state: SyncStatusesChain) => {
          contractInState(state).fetchedBlockNumber = to;
          contractInState(state).isAbort = registerCount >= 2;
          return state;
        });
      },
    );

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The first request fails, and then one request for each event.
    const eventCount: number = targetContract.events.names.length;
    expect(getLogsRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      ...Array(eventCount).fill([
        creationBlockNumber,
        creationBlockNumber + bulkUnit / 2 - 1,
      ]),
      ...Array(eventCount).fill([
        creationBlockNumber + bulkUnit / 2,
        creationBlockNumber + bulkUnit / 2 + bulkUnit - 1,
      ]),
    ]);
    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should keep at least 2 blocks from the creation block after halving", async () => {
    storeRpcSettings.updateState(targetChain.name, { bulkUnit: 2 });
    const { provider, getLogsRanges } = providerFailingGetLogs(1);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The first request fails, and then one request for each event.
    expect(getLogsRanges()).toEqual(
      Array(1 + targetContract.events.names.length).fill([
        creationBlockNumber,
        creationBlockNumber + 1,
      ]),
    );
  });
});
