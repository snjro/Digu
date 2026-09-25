import type { Chain, ChainName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { DbEventLogs } from "./dbEventLogs";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";
import { getTargetChain } from "@utils/utilsDb";
import { getDbRecordsSyncStatusContractByKeyValue } from "./dbEventLogsDataHandlersSyncStatusGetters";
import { storeSyncStatus } from "@stores/storeSyncStatus";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

export async function updateSyncStatusInChain<
  T extends keyof SyncStatusContract,
  U extends keyof SyncStatusContract,
>(
  chainName: ChainName,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  updateKey: U,
  updateValue: SyncStatusContract[U],
): Promise<void> {
  const targetChain: Chain = getTargetChain({ chainName: chainName });
  const promiseUpdate: Promise<void>[] = [];
  for (const project of targetChain.projects) {
    for (const version of project.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: chainName,
        projectName: project.name,
        versionName: version.name,
      };
      const dbEventLogs = new DbEventLogs(versionIdentifier);
      promiseUpdate.push(
        updateSyncStatusInVersion(
          dbEventLogs,
          targetKey,
          targetValue,
          updateKey,
          updateValue,
        ),
      );
    }
  }
  await Promise.all(promiseUpdate);
}

async function updateSyncStatusInVersion<
  T extends keyof SyncStatusContract,
  U extends keyof SyncStatusContract,
>(
  dbEventLogs: DbEventLogs,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  updateKey: U,
  updateValue: SyncStatusContract[U],
): Promise<void> {
  const newSyncStatusContract: Partial<SyncStatusContract> = {
    [updateKey]: updateValue,
  };
  // Read and write in one transaction, so that a row changed in between is
  // not overwritten with the result of an old read.
  const targetSyncStatusesContract: SyncStatusContract[] =
    await dbEventLogs.transaction("rw", tableNameSyncStatus, async () => {
      const syncStatusesContract: SyncStatusContract[] =
        await getDbRecordsSyncStatusContractByKeyValue(
          dbEventLogs,
          targetKey,
          targetValue,
        );
      await Promise.all(
        syncStatusesContract.map((syncStatusContract: SyncStatusContract) =>
          dbEventLogs
            .table(tableNameSyncStatus)
            .update(syncStatusContract.name, newSyncStatusContract),
        ),
      );
      return syncStatusesContract;
    });
  // Update the store only after the commit.
  for (const syncStatusContract of targetSyncStatusesContract) {
    storeSyncStatus.updateState(
      {
        ...dbEventLogs.versionIdentifier,
        contractName: syncStatusContract.name,
      },
      newSyncStatusContract,
    );
  }
}
