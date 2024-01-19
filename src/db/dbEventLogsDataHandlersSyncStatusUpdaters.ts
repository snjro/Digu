import type { ContractName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { DbEventLogs } from "./dbEventLogs";
import type { ContractIdentifier, SyncStatusContract } from "./dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;
export async function updateDbIsSyncTarget(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  newValue: boolean,
) {
  await updateDbItemSyncStatus(
    dbEventLogs,
    contractName,
    "isSyncTarget",
    newValue,
  );

  const numOfSyncTargetContract: number = newValue ? 1 : 0;

  await updateDbItemSyncStatus(
    dbEventLogs,
    contractName,
    "numOfSyncTargetContract",
    numOfSyncTargetContract,
  );
}

export async function updateDbItemSyncStatus<
  T extends keyof SyncStatusContract,
>(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  key: T,
  newValue: SyncStatusContract[T],
): Promise<void> {
  await updateDbRecordSyncStatus(dbEventLogs, contractName, {
    [key]: newValue,
  });
}

export async function updateDbRecordSyncStatus(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  newSyncStatusContract: Partial<SyncStatusContract>,
): Promise<void> {
  const contractIdentifier: ContractIdentifier = {
    ...dbEventLogs.versionIdentifier,
    contractName: contractName,
  };
  await dbEventLogs
    .transaction("rw", dbEventLogs.table(tableNameSyncStatus), async () => {
      // update table
      await dbEventLogs
        .table(tableNameSyncStatus)
        .update(contractName, newSyncStatusContract);
    })
    .then(() => {
      //update store
      storeSyncStatus.updateState(contractIdentifier, newSyncStatusContract);
    });
}
