import type { ChainName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import type { ChainStatus } from "./dbTypes";
import { dbChainStatus } from "./dbChainStatus";
import { storeChainStatus } from "@stores/storeChainStatus";
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
