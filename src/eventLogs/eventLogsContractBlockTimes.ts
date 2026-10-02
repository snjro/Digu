import type { ChainName } from "#constants/chains/types.js";
import { getDbRecordsBlockTime } from "#db/dbBlockTimesDataHandlers.js";
import type { BlockTime, EthersEventLog } from "#db/dbTypes.js";
import { removeDuplicateValuesFromArray } from "#utils/utilsCommon.js";
import {
  getBlockTimestampFromLogs,
  getLoggableError,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { convertTimestampSecToIso8601 } from "#utils/utilsTime.js";
import type { Block } from "ethers";

export const MAX_CONCURRENT_BLOCK_REQUESTS: number = 5;

export type BlockTimeForEventLog = {
  fetchedBlockTime: BlockTime;
  fetchedFromProvider: boolean;
};

export async function fetchBlockTimesForEventLogs(
  nodeProvider: NodeProvider,
  chainName: ChainName,
  ethersEventLogs: EthersEventLog[],
): Promise<BlockTimeForEventLog[]> {
  const deplicateEventLogBlockNumbers: number[] = ethersEventLogs.map(
    (ethersEventLog: EthersEventLog) => {
      return ethersEventLog.blockNumber;
    },
  );
  const eventLogBlockNumbers = removeDuplicateValuesFromArray<number>(
    deplicateEventLogBlockNumbers,
  );
  const blockTimesForEventLogs: BlockTimeForEventLog[] = [];
  // The time in the logs, which saves a request for the block.
  const blockNumbersNotInLogs: number[] = [];
  for (const eventLogBlockNumber of eventLogBlockNumbers) {
    const timestamp: number | undefined = getBlockTimestampFromLogs(
      nodeProvider,
      eventLogBlockNumber,
    );
    if (timestamp === undefined) {
      blockNumbersNotInLogs.push(eventLogBlockNumber);
    } else {
      blockTimesForEventLogs.push({
        fetchedBlockTime: {
          blockNumber: eventLogBlockNumber,
          timestamp: timestamp,
          isoDatetime: convertTimestampSecToIso8601(timestamp),
        },
        fetchedFromProvider: true,
      });
    }
  }
  // Read at once, instead of one transaction for each block.
  const blockTimesInDb: (BlockTime | undefined)[] = await getDbRecordsBlockTime(
    chainName,
    blockNumbersNotInLogs,
  );
  const blockNumbersNotInDb: number[] = [];
  blockNumbersNotInLogs.forEach(
    (eventLogBlockNumber: number, index: number) => {
      const blockTime: BlockTime | undefined = blockTimesInDb[index];
      if (blockTime) {
        blockTimesForEventLogs.push({
          fetchedBlockTime: blockTime,
          fetchedFromProvider: false,
        });
      } else {
        blockNumbersNotInDb.push(eventLogBlockNumber);
      }
    },
  );

  // A few at a time, so that the RPC does not limit the requests.
  for (
    let index: number = 0;
    index < blockNumbersNotInDb.length;
    index += MAX_CONCURRENT_BLOCK_REQUESTS
  ) {
    const blocks: Block[] = await Promise.all(
      blockNumbersNotInDb
        .slice(index, index + MAX_CONCURRENT_BLOCK_REQUESTS)
        .map((blockNumber: number) =>
          fetchBlockFromNodeProvider(nodeProvider, blockNumber),
        ),
    );
    for (const block of blocks) {
      blockTimesForEventLogs.push({
        fetchedBlockTime: {
          blockNumber: block.number,
          timestamp: block.timestamp,
          isoDatetime: convertTimestampSecToIso8601(block.timestamp),
        },
        fetchedFromProvider: true,
      });
    }
  }

  return blockTimesForEventLogs;
}
async function fetchBlockFromNodeProvider(
  nodeProvider: NodeProvider,
  blockNumber: number,
): Promise<Block> {
  let block: Block | null;
  try {
    block = await nodeProvider.getBlock(blockNumber);
  } catch (error) {
    throw new Error(
      `Error! Exception in "nodeProvider.getBlock". Block number is ${blockNumber}.`,
      // The raw ethers error may hold the RPC URL with an API key.
      // eslint-disable-next-line preserve-caught-error
      { cause: getLoggableError(error) },
    );
  }
  if (!isPureBlock(block)) {
    throw new Error(
      `"nodeProvider.getBlock" returned no block. Block number is ${blockNumber}.`,
    );
  }
  return block;
}
function isPureBlock(value: Block | null): value is Block {
  return value !== null;
}
