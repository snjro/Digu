import type { Chain, ChainName } from "#constants/chains/types.js";
import { DB_TABLE_NAMES } from "./constants";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { getTargetChain } from "#utils/utilsDb.js";
import { getDbRecordsSyncStatusContractByKeyValue } from "./dbEventLogsDataHandlersSyncStatusGetters";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

// Returns the contracts whose rows it changed.
export async function updateSyncStatusInChain<
  T extends keyof SyncStatusContract,
>(
  chainName: ChainName,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  newSyncStatusContract: Partial<SyncStatusContract>,
): Promise<ContractIdentifier[]> {
  const targetChain: Chain = getTargetChain({ chainName: chainName });
  const promiseUpdate: Promise<ContractIdentifier[]>[] = [];
  for (const project of targetChain.projects) {
    for (const version of project.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: chainName,
        projectName: project.name,
        versionName: version.name,
      };
      const dbEventLogs = getDbEventLogs(versionIdentifier);
      promiseUpdate.push(
        updateSyncStatusInVersion(
          dbEventLogs,
          targetKey,
          targetValue,
          newSyncStatusContract,
        ),
      );
    }
  }
  return (await Promise.all(promiseUpdate)).flat();
}

async function updateSyncStatusInVersion<T extends keyof SyncStatusContract>(
  dbEventLogs: DbEventLogs,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  newSyncStatusContract: Partial<SyncStatusContract>,
): Promise<ContractIdentifier[]> {
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
  const contractIdentifiers: ContractIdentifier[] =
    targetSyncStatusesContract.map(
      (syncStatusContract: SyncStatusContract) => ({
        ...dbEventLogs.versionIdentifier,
        contractName: syncStatusContract.name,
      }),
    );
  // Update the store only after the commit.
  for (const contractIdentifier of contractIdentifiers) {
    storeSyncStatus.updateState(contractIdentifier, newSyncStatusContract);
  }
  return contractIdentifiers;
}
