import type { ChainName } from "@constants/chains/types";
import { getDbRecordBlockTime } from "@db/dbBlockTimesDataHandlers";
import type { BlockTime, EthersEventLog } from "@db/dbTypes";
import { removeDuplicateValuesFromArray } from "@utils/utilsCommon";
import type { NodeProvider } from "@utils/utilsEthers";
import { convertTimestampSecToIso8601 } from "@utils/utilsTime";
import type { Block } from "ethers";

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
  const blockTimesForEventLogs: BlockTimeForEventLog[] = await Promise.all(
    eventLogBlockNumbers.map(async (eventLogBlockNumber: number) => {
      return await fetchBlockTimeFromDbOrProvider(
        nodeProvider,
        chainName,
        eventLogBlockNumber,
      );
    }),
  );

  return blockTimesForEventLogs;
}
async function fetchBlockTimeFromDbOrProvider(
  nodeProvider: NodeProvider,
  chainName: ChainName,
  targetBlockNumber: number,
): Promise<BlockTimeForEventLog> {
  const blockTime: BlockTime | undefined = await getDbRecordBlockTime(
    chainName,
    targetBlockNumber,
  );

  if (blockTime) {
    return { fetchedBlockTime: blockTime, fetchedFromProvider: false };
  } else {
    const block: Block = await fetchBlockFromNodeProvider(
      nodeProvider,
      targetBlockNumber,
    );
    return {
      fetchedBlockTime: {
        blockNumber: block.number,
        timestamp: block.timestamp,
        isoDatetime: convertTimestampSecToIso8601(block.timestamp),
      },
      fetchedFromProvider: true,
    };
  }
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
      `Error! Exception in "nodeProvider.getBlock". Block number is ${blockNumber}. error: ${error}`,
    );
  }
}
function isPureBlock(value: Block | null): value is Block {
  return value !== null;
}
