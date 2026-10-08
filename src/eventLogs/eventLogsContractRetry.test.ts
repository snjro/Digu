import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { JsonRpcProvider, Network } from "ethers";
import type { JsonRpcPayload, JsonRpcResult } from "ethers";
import {
  ERRORS_TO_HALVE_ANYWAY,
  fetchEventLogsContract,
  INITIAL_BULK_UNIT,
  MAX_BULK_UNIT,
  SUCCESSES_TO_RAISE_LIMIT,
  TRY_COUNT,
} from "./eventLogsContract";
import { registerEventLogsAndBlockTimes } from "./eventLogsContractUpdateTables";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import {
  providerAnsweringGetLogs,
  type GetLogsAnswer,
} from "#utils/testCommon.js";
import { customLogger } from "#utils/logger.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import type { DbEventLogs } from "#db/dbEventLogs.js";
import type { SyncStatusContract, SyncStatusesChain } from "#db/dbTypes.js";
import { get } from "svelte/store";

vi.mock("./eventLogsContractUpdateTables");
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js");

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
// that fails the first eth_getLogs requests, or the requests for which
// failCount returns true (the first request is 1).
function providerFailingGetLogs(
  failCount: number | ((requestNumber: number) => boolean),
): {
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
        const fails: boolean =
          typeof failCount === "number"
            ? getLogsCount <= failCount
            : failCount(getLogsCount);
        return fails
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
  const bulkUnit: number = INITIAL_BULK_UNIT;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    storeSyncStatus.update((state: SyncStatusesChain) => {
      Object.assign(contractInState(state), {
        isSyncTarget: true,
        isAbort: false,
        fetchedBlockNumber: creationBlockNumber,
      });
      state[targetChain.name].isAbort = false;
      return state;
    });
    storeSyncStoppedReason.clear(targetChain.name);
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
    const { provider, getLogsCount } = providerFailingGetLogs(TRY_COUNT);

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
    expect(getLogsCount()).toBe(TRY_COUNT + 1);
  });

  test("should abort the chain when the errors exceed Try Count", async () => {
    const { provider, getLogsCount } = providerFailingGetLogs(TRY_COUNT + 1);

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
    expect(getLogsCount()).toBe(TRY_COUNT + 1);
    expect(get(storeSyncStoppedReason)[targetChain.name]).toBe("RPC_ERRORS");
  });

  test("should keep no reason when the user stops during the request that exceeds Try Count", async () => {
    const { provider } = providerFailingGetLogs((requestNumber: number) => {
      if (requestNumber === TRY_COUNT + 1) {
        storeSyncStatus.update((state: SyncStatusesChain) => {
          state[targetChain.name].isAbort = true;
          return state;
        });
        abort();
      }
      return true;
    });

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(startAbortingInChain).toHaveBeenCalledOnce();
    expect(get(storeSyncStoppedReason)[targetChain.name]).toBeUndefined();
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

  test("should try the same range again after an error, without halving it", async () => {
    const { provider, getLogsRanges } = providerFailingGetLogs(1);
    registerUntil(2);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The first request fails, the same range succeeds, and the range is
    // doubled as usual.
    expect(getLogsRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber + bulkUnit, creationBlockNumber + 3 * bulkUnit - 1],
    ]);
    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should halve the range after two errors in a row and not widen it beyond the halved width", async () => {
    const { provider, getLogsRanges } = providerFailingGetLogs(2);
    registerUntil(3);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The first two requests fail, and then one request for each range.
    const half: number = bulkUnit / 2;
    expect(getLogsRanges()).toEqual([
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber, creationBlockNumber + bulkUnit - 1],
      [creationBlockNumber, creationBlockNumber + half - 1],
      [creationBlockNumber + half, creationBlockNumber + 2 * half - 1],
      [creationBlockNumber + 2 * half, creationBlockNumber + 3 * half - 1],
    ]);
    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should raise the limit after SUCCESSES_TO_RAISE_LIMIT successes in a row", async () => {
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 100 * bulkUnit,
    });
    const { provider, getLogsRanges } = providerFailingGetLogs(2);
    registerUntil(SUCCESSES_TO_RAISE_LIMIT + 1);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The first two requests fail, the halved width until the limit is
    // raised, and then the doubled width.
    expect(
      getLogsRanges().map(([from, to]: number[]) => to - from + 1),
    ).toEqual([
      bulkUnit,
      bulkUnit,
      ...Array(SUCCESSES_TO_RAISE_LIMIT).fill(bulkUnit / 2),
      bulkUnit,
    ]);
  });

  test("should not start counting the successes again after one error", async () => {
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber: creationBlockNumber + 100 * bulkUnit,
    });
    const successesBeforeError: number = 5;
    // Two errors halve the range; later, one error in the middle.
    const middleError: number = 2 + successesBeforeError + 1;
    const { provider, getLogsRanges } = providerFailingGetLogs(
      (requestNumber: number) =>
        requestNumber <= 2 || requestNumber === middleError,
    );
    registerUntil(SUCCESSES_TO_RAISE_LIMIT + 1);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The limit is raised after SUCCESSES_TO_RAISE_LIMIT successes, counting
    // the ones before the error in the middle.
    const half: number = bulkUnit / 2;
    expect(
      getLogsRanges().map(([from, to]: number[]) => to - from + 1),
    ).toEqual([
      bulkUnit,
      bulkUnit,
      ...Array(successesBeforeError).fill(half),
      half,
      ...Array(SUCCESSES_TO_RAISE_LIMIT - successesBeforeError).fill(half),
      bulkUnit,
    ]);
  });

  test("should double the range after each success up to MAX_BULK_UNIT", async () => {
    const expectedWidths: number[] = [];
    for (let width = bulkUnit; width < MAX_BULK_UNIT; width *= 2) {
      expectedWidths.push(width);
    }
    expectedWidths.push(MAX_BULK_UNIT, MAX_BULK_UNIT);
    storeChainStatus.updateState(targetChain.name, {
      latestBlockNumber:
        creationBlockNumber + expectedWidths.length * MAX_BULK_UNIT,
    });
    const { provider, getLogsRanges } = providerFailingGetLogs(0);
    registerUntil(expectedWidths.length);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(
      getLogsRanges().map(([from, to]: number[]) => to - from + 1),
    ).toEqual(expectedWidths);
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
    // Errors in a row halve the range from the second one, down to 1 block.
    let errorCount: number = 1;
    for (let width = bulkUnit; width > 1; width = Math.floor(width / 2)) {
      errorCount++;
    }
    expect(errorCount).toBeLessThanOrEqual(TRY_COUNT);
    const { provider, getLogsRanges } = providerFailingGetLogs(errorCount);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // The request after the errors is for 2 blocks, not 1.
    expect(getLogsRanges()).toHaveLength(errorCount + 1);
    expect(getLogsRanges().at(-1)).toEqual([
      creationBlockNumber,
      creationBlockNumber + 1,
    ]);
  });

  // Errors that do not depend on the width of the range.
  const errorsUnrelatedToRange: GetLogsAnswer[] = [
    500,
    504,
    "historical state is not available",
  ];
  const widthsOf = (ranges: number[][]): number[] =>
    ranges.map(([from, to]: number[]) => to - from + 1);

  test.each(errorsUnrelatedToRange)(
    "should try the same range again after two errors of %s in a row, without halving it",
    async (answer: GetLogsAnswer) => {
      const { provider, getLogsRanges } = providerAnsweringGetLogs(
        targetChain.chainId,
        (requestNumber: number) => (requestNumber <= 2 ? answer : undefined),
      );
      registerUntil(2);

      const promise: Promise<void> = fetchEventLogsContract(
        dbEventLogs,
        targetContract,
        provider,
      );
      await vi.runAllTimersAsync();
      await promise;

      // The range is doubled as usual after the success.
      expect(getLogsRanges()).toEqual([
        ...Array(3).fill([
          creationBlockNumber,
          creationBlockNumber + bulkUnit - 1,
        ]),
        [
          creationBlockNumber + bulkUnit,
          creationBlockNumber + 3 * bulkUnit - 1,
        ],
      ]);
      expect(startAbortingInChain).not.toHaveBeenCalled();
    },
  );

  test.each(errorsUnrelatedToRange)(
    "should count the errors of %s toward Try Count",
    async (answer: GetLogsAnswer) => {
      const { provider, getLogsRanges } = providerAnsweringGetLogs(
        targetChain.chainId,
        () => answer,
      );

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
      expect(getLogsRanges()).toHaveLength(TRY_COUNT + 1);
    },
  );

  test("should halve the range after ERRORS_TO_HALVE_ANYWAY errors in a row that do not depend on the range", async () => {
    const { provider, getLogsRanges } = providerAnsweringGetLogs(
      targetChain.chainId,
      (requestNumber: number) =>
        requestNumber <= ERRORS_TO_HALVE_ANYWAY + 1 ? 500 : undefined,
    );

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    // Halved after each error from the ERRORS_TO_HALVE_ANYWAY-th one, in case
    // the RPC answers a range that is too wide with HTTP 500.
    expect(widthsOf(getLogsRanges())).toEqual([
      ...Array(ERRORS_TO_HALVE_ANYWAY).fill(bulkUnit),
      bulkUnit / 2,
      bulkUnit / 4,
    ]);
    expect(startAbortingInChain).not.toHaveBeenCalled();
  });

  test("should not halve the range after an error of each kind", async () => {
    const answers: GetLogsAnswer[] = [
      "query exceeds max block range 10000",
      504,
    ];
    const { provider, getLogsRanges } = providerAnsweringGetLogs(
      targetChain.chainId,
      (requestNumber: number) => answers[requestNumber - 1],
    );
    registerUntil(2);

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(widthsOf(getLogsRanges())).toEqual([
      bulkUnit,
      bulkUnit,
      bulkUnit,
      2 * bulkUnit,
    ]);
  });

  test("should halve the range after two errors in a row of another HTTP status", async () => {
    const { provider, getLogsRanges } = providerAnsweringGetLogs(
      targetChain.chainId,
      (requestNumber: number) => (requestNumber <= 2 ? 503 : undefined),
    );

    const promise: Promise<void> = fetchEventLogsContract(
      dbEventLogs,
      targetContract,
      provider,
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(widthsOf(getLogsRanges())).toEqual([
      bulkUnit,
      bulkUnit,
      bulkUnit / 2,
    ]);
  });
});
