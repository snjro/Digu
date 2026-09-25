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

export async function getDbRecordBlockTime(
  chainName: ChainName,
  blockNumber: BlockTime["blockNumber"],
): Promise<BlockTime | undefined> {
  return await dbBlockTimes.transaction("r", chainName, async () => {
    return await dbBlockTimes.table(chainName).get(blockNumber);
  });
}
export async function getDbRecordsBlockTime(
  chainName: ChainName,
  blockNumbers: BlockTime["blockNumber"][],
): Promise<(BlockTime | undefined)[]> {
  return await dbBlockTimes.transaction("r", chainName, async () => {
    return await dbBlockTimes.table(chainName).bulkGet(blockNumbers);
  });
}
