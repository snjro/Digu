import type { ChainName } from "#constants/chains/types.js";
import { DB_TABLE_NAMES } from "./constants";
import type { ChainStatus } from "./dbTypes";
import { dbChainStatus } from "./dbChainStatus";
import { storeChainStatus } from "#stores/storeChainStatus.js";
const tableNameChainStatus = DB_TABLE_NAMES.ChainStatus;
export async function getDbRecordChainStatus(
  chainName: ChainName,
): Promise<ChainStatus> {
  return await dbChainStatus.transaction(
    "r",
    tableNameChainStatus,
    async () => {
      return await dbChainStatus.table(tableNameChainStatus).get(chainName);
    },
  );
}

export async function updateDbItemChainStatus<T extends keyof ChainStatus>(
  chainName: ChainName,
  key: T,
  newValue: ChainStatus[T],
): Promise<void> {
  await dbChainStatus
    .transaction("rw", tableNameChainStatus, async () => {
      // update table
      await dbChainStatus
        .table(tableNameChainStatus)
        .update(chainName, { [key]: newValue });
    })
    .then(() => {
      //update store
      storeChainStatus.updateState(chainName, { [key]: newValue });
    });
}
// Only a higher block, read and written in one transaction, so that a late or
// older answer, or another tab, does not move the latest block back.
export async function raiseDbLatestBlockNumber(
  chainName: ChainName,
  latestBlockNumber: number,
): Promise<void> {
  const raised: boolean = await dbChainStatus.transaction(
    "rw",
    tableNameChainStatus,
    async () => {
      const chainStatus: ChainStatus | undefined = await dbChainStatus
        .table(tableNameChainStatus)
        .get(chainName);
      if (
        chainStatus !== undefined &&
        latestBlockNumber <= chainStatus.latestBlockNumber
      ) {
        return false;
      }
      await dbChainStatus
        .table(tableNameChainStatus)
        .update(chainName, { latestBlockNumber });
      return true;
    },
  );
  if (raised) storeChainStatus.updateState(chainName, { latestBlockNumber });
}
