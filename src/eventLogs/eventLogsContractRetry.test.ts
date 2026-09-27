import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { JsonRpcProvider, Network } from "ethers";
import type { JsonRpcPayload, JsonRpcResult } from "ethers";
import { fetchEventLogsContract, MAX_BULK_UNIT } from "./eventLogsContract";
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
    // One request for each range, not one for each event.
    expect(targetContract.events.names.length).toBeGreaterThan(1);
    expect(getLogsCount()).toBe(tryCount + 1);
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

  // Registers the fetched block number, and aborts after the given number of
  // registrations. onRegister runs after each registration.
  function registerUntil(
    count: number,
    onRegister: (registerCount: number) => void = () => {},
  ): void {
    let registerCount: number = 0;
    vi.mocked(registerEventLogsAndBlockTimes).mockImplementation(
      async (_dbEventLogs, _targetContract, _nodeProvider, _logs, to) => {
        registerCount++;
        storeSyncStatus.update((state: SyncStatusesChain) => {
          contractInState(state).fetchedBlockNumber = to;
          contractInState(state).isAbort = registerCount >= count;
          return state;
        });
        onRegister(registerCount);
      },
    );
  }

  test("should halve the range after an error and not widen it beyond the halved width", async () => {
    const { provider, getLogsRanges } = providerFailingGetLogs(1);
    registerUntil(3);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The first request fails, and then one request for each range.
    const half: number = bulkUnit / 2;
    expect(getLogsRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber, creationBlockNumber + half - 1],
      [creationBlockNumber + half, creationBlockNumber + 2 * half - 1],
      [creationBlockNumber + 2 * half, creationBlockNumber + 3 * half - 1],
    ]);
    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should double the range after each success up to MAX_BULK_UNIT", async () => {
    const startBulkUnit: number = 30000;
    storeRpcSettings.updateState(targetChain.name, { bulkUnit: startBulkUnit });
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 10 * MAX_BULK_UNIT,
    });
    const { provider, getLogsRanges } = providerFailingGetLogs(0);
    registerUntil(4);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(
      getLogsRanges().map(([from, to]: number[]) => to - from + 1),
    ).toEqual([startBulkUnit, 2 * startBulkUnit, MAX_BULK_UNIT, MAX_BULK_UNIT]);
  });

  test("should not widen the range after a range cut at the latest block", async () => {
    const latestBlockNumber: number = creationBlockNumber + bulkUnit + 50;
    storeChainStatus.updateState(targetChain.name, { latestBlockNumber });
    const { provider, getLogsRanges } = providerFailingGetLogs(0);
    registerUntil(3, (registerCount: number) => {
      if (registerCount === 2) {
        storeChainStatus.updateState(targetChain.name, {
          latestBlockNumber: creationBlockNumber + 100 * bulkUnit,
        });
      }
    });

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // Doubled after the first range, and not after the second one.
    expect(getLogsRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber + bulkUnit, latestBlockNumber],
      [latestBlockNumber + 1, latestBlockNumber + 2 * bulkUnit],
    ]);
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

    // The first request fails, and then one request for the range.
    expect(getLogsRanges()).toEqual(
      Array(2).fill([creationBlockNumber, creationBlockNumber + 1]),
    );
  });
});
