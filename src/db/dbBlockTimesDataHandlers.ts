import type { ChainName } from "@constants/chains/types";
import { dbBlockTimes } from "./dbBlockTimes";
import type { BlockTime } from "./dbTypes";

export async function setDbBlockTime(
  chainName: ChainName,
  blockTimes: BlockTime[],
): Promise<void> {
  await dbBlockTimes.transaction("rw", chainName, async () => {
    await dbBlockTimes.table(chainName).bulkPut(blockTimes);
  });
}

export async function getDbRecordBlockTimeRecords(
  chainName: ChainName,
): Promise<BlockTime[]> {
  return await dbBlockTimes.table(chainName).toArray();
}
export async function getDbRecordBlockTime(
  chainName: ChainName,
  blockNumber: BlockTime["blockNumber"],
): Promise<BlockTime | undefined> {
  return await dbBlockTimes.transaction("r", chainName, async () => {
    return await dbBlockTimes.table(chainName).get(blockNumber);
  });
}
export async function getDbItemBlockTime<T extends keyof BlockTime>(
  chainName: ChainName,
  blockNumber: BlockTime["blockNumber"],
  key: T,
): Promise<BlockTime[T] | undefined> {
  const blockTimeRecord: BlockTime | undefined = await getDbRecordBlockTime(
    chainName,
    blockNumber,
  );
  return blockTimeRecord ? blockTimeRecord[key] : undefined;
}
