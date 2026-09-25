import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Block } from "ethers";
import {
  fetchBlockTimesForEventLogs,
  MAX_CONCURRENT_BLOCK_REQUESTS,
} from "./eventLogsContractBlockTimes";
import { dbBlockTimes } from "@db/dbBlockTimes";
import { setDbBlockTime } from "@db/dbBlockTimesDataHandlers";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { ChainName } from "@constants/chains/types";
import type { BlockTime, EthersEventLog } from "@db/dbTypes";
import type { NodeProvider } from "@utils/utilsEthers";
import { convertTimestampSecToIso8601 } from "@utils/utilsTime";

const chainName: ChainName = TARGET_CHAINS[0].name;

function eventLogsAt(blockNumbers: number[]): EthersEventLog[] {
  return blockNumbers.map(
    (blockNumber: number) => ({ blockNumber }) as EthersEventLog,
  );
}
function timestampOf(blockNumber: number): number {
  return 1_700_000_000 + blockNumber * 12;
}
function blockTimeOf(blockNumber: number): BlockTime {
  return {
    blockNumber,
    timestamp: timestampOf(blockNumber),
    isoDatetime: convertTimestampSecToIso8601(timestampOf(blockNumber)),
  };
}
// A provider that returns a block for any block number.
function fakeProvider(): {
  nodeProvider: NodeProvider;
  getBlock: ReturnType<typeof vi.fn>;
} {
  const getBlock = vi.fn(
    async (blockNumber: number): Promise<Block | null> =>
      ({ number: blockNumber, timestamp: timestampOf(blockNumber) }) as Block,
  );
  return {
    nodeProvider: { getBlock } as unknown as NodeProvider,
    getBlock,
  };
}

describe("fetchBlockTimesForEventLogs", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await dbBlockTimes.table(chainName).clear();
  });

  test("should use the block time in the DB without requesting the block", async () => {
    await setDbBlockTime(chainName, [blockTimeOf(10)]);
    const { nodeProvider, getBlock } = fakeProvider();

    const result = await fetchBlockTimesForEventLogs(
      nodeProvider,
      chainName,
      eventLogsAt([10]),
    );

    expect(result).toEqual([
      { fetchedBlockTime: blockTimeOf(10), fetchedFromProvider: false },
    ]);
    expect(getBlock).not.toHaveBeenCalled();
  });

  test("should request the block when the DB does not have its time", async () => {
    const { nodeProvider, getBlock } = fakeProvider();

    const result = await fetchBlockTimesForEventLogs(
      nodeProvider,
      chainName,
      eventLogsAt([20]),
    );

    expect(result).toEqual([
      { fetchedBlockTime: blockTimeOf(20), fetchedFromProvider: true },
    ]);
    expect(getBlock).toHaveBeenCalledExactlyOnceWith(20);
  });

  test("should return one block time for each block", async () => {
    await setDbBlockTime(chainName, [blockTimeOf(10)]);
    const { nodeProvider, getBlock } = fakeProvider();

    const result = await fetchBlockTimesForEventLogs(
      nodeProvider,
      chainName,
      eventLogsAt([10, 20, 10, 20, 30]),
    );

    expect(result).toEqual([
      { fetchedBlockTime: blockTimeOf(10), fetchedFromProvider: false },
      { fetchedBlockTime: blockTimeOf(20), fetchedFromProvider: true },
      { fetchedBlockTime: blockTimeOf(30), fetchedFromProvider: true },
    ]);
    expect(getBlock.mock.calls).toEqual([[20], [30]]);
  });

  test("should return nothing for no event logs", async () => {
    const { nodeProvider, getBlock } = fakeProvider();

    expect(
      await fetchBlockTimesForEventLogs(nodeProvider, chainName, []),
    ).toEqual([]);
    expect(getBlock).not.toHaveBeenCalled();
  });

  test("should read the block times from the DB at once", async () => {
    await setDbBlockTime(chainName, [blockTimeOf(10), blockTimeOf(30)]);
    const table = dbBlockTimes.table(chainName);
    const spyGet = vi.spyOn(table, "get");
    const spyBulkGet = vi.spyOn(table, "bulkGet");
    const { nodeProvider } = fakeProvider();

    await fetchBlockTimesForEventLogs(
      nodeProvider,
      chainName,
      eventLogsAt([10, 20, 10, 30]),
    );

    expect(spyBulkGet).toHaveBeenCalledExactlyOnceWith([10, 20, 30]);
    expect(spyGet).not.toHaveBeenCalled();
  });

  test("should limit the number of concurrent requests for blocks", async () => {
    const { nodeProvider, getBlock } = fakeProvider();
    let inFlight: number = 0;
    let maxInFlight: number = 0;
    getBlock.mockImplementation(async (blockNumber: number) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      return { number: blockNumber, timestamp: timestampOf(blockNumber) };
    });
    const blockNumbers: number[] = Array.from(
      { length: 3 * MAX_CONCURRENT_BLOCK_REQUESTS + 1 },
      (_, index: number) => 100 + index,
    );

    const result = await fetchBlockTimesForEventLogs(
      nodeProvider,
      chainName,
      eventLogsAt(blockNumbers),
    );

    expect(maxInFlight).toBe(MAX_CONCURRENT_BLOCK_REQUESTS);
    expect(result).toEqual(
      blockNumbers.map((blockNumber: number) => ({
        fetchedBlockTime: blockTimeOf(blockNumber),
        fetchedFromProvider: true,
      })),
    );
  });

  test("should throw when the provider returns no block", async () => {
    const { nodeProvider, getBlock } = fakeProvider();
    getBlock.mockResolvedValueOnce(null);

    await expect(
      fetchBlockTimesForEventLogs(nodeProvider, chainName, eventLogsAt([20])),
    ).rejects.toThrow("Block number is 20");
  });

  test("should throw when the request for the block fails", async () => {
    const { nodeProvider, getBlock } = fakeProvider();
    getBlock.mockRejectedValueOnce(new Error("RPC error"));

    await expect(
      fetchBlockTimesForEventLogs(nodeProvider, chainName, eventLogsAt([20])),
    ).rejects.toThrow("RPC error");
  });
});
