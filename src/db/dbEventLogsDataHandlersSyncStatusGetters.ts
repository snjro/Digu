import type { ContractName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { DbEventLogs } from "./dbEventLogs";
import type { SyncStatusContract } from "./dbTypes";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;
export async function getDbRecordSyncStatusContract(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
): Promise<SyncStatusContract> {
  return await dbEventLogs.transaction("r", tableNameSyncStatus, async () => {
    return await dbEventLogs.table(tableNameSyncStatus).get(contractName);
  });
}
export async function getDbRecordsSyncStatusContractByKeyValue<
  T extends keyof SyncStatusContract,
>(
  dbEventLogs: DbEventLogs,
  key: T,
  value: SyncStatusContract[T],
): Promise<SyncStatusContract[]> {
  return await dbEventLogs.transaction("r", tableNameSyncStatus, async () => {
    const syncingSyncStatusesContract: SyncStatusContract[] = (
      await dbEventLogs.table(tableNameSyncStatus).toArray()
    ).filter((syncStatusContract: SyncStatusContract) => {
      return syncStatusContract[key] === value;
    });

    return syncingSyncStatusesContract;
  });
}

export async function getDbItemSyncStatus<T extends keyof SyncStatusContract>(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  key: T,
): Promise<SyncStatusContract[T]> {
  const syncStatusContract: SyncStatusContract =
    await getDbRecordSyncStatusContract(dbEventLogs, contractName);
  return syncStatusContract[key];
}
