import type { ChainName } from "@constants/chains/types";
import { getDbRecordsBlockTime } from "@db/dbBlockTimesDataHandlers";
import type { BlockTime, EthersEventLog } from "@db/dbTypes";
import { removeDuplicateValuesFromArray } from "@utils/utilsCommon";
import { getLoggableError, type NodeProvider } from "@utils/utilsEthers";
import { convertTimestampSecToIso8601 } from "@utils/utilsTime";
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
  // Read at once, instead of one transaction for each block.
  const blockTimesInDb: (BlockTime | undefined)[] = await getDbRecordsBlockTime(
    chainName,
    eventLogBlockNumbers,
  );
  const blockTimesForEventLogs: BlockTimeForEventLog[] = [];
  const blockNumbersNotInDb: number[] = [];
  eventLogBlockNumbers.forEach((eventLogBlockNumber: number, index: number) => {
    const blockTime: BlockTime | undefined = blockTimesInDb[index];
    if (blockTime) {
      blockTimesForEventLogs.push({
        fetchedBlockTime: blockTime,
        fetchedFromProvider: false,
      });
    } else {
      blockNumbersNotInDb.push(eventLogBlockNumber);
    }
  });

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
    if (isPureBlock(block)) {
      return block;
    } else {
      throw new Error();
    }
  } catch (error) {
    throw new Error(
      `Error! Exception in "nodeProvider.getBlock". Block number is ${blockNumber}.`,
      // The raw ethers error may hold the RPC URL with an API key.
      // eslint-disable-next-line preserve-caught-error
      { cause: getLoggableError(error) },
    );
  }
}
function isPureBlock(value: Block | null): value is Block {
  return value !== null;
}
