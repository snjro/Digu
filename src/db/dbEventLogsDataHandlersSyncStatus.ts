import type { Chain, ChainName, ContractName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { DbEventLogs } from "./dbEventLogs";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { myLogger } from "@utils/logger";
import { getTargetChain } from "@utils/utlisDb";
import { storeSyncStatus } from "@stores/storeSyncStatus";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;
export async function startSyncingInChain(chainName: ChainName): Promise<void> {
  await setSyncStatusInChain(
    chainName,
    "isSyncTarget",
    true,
    "isSyncing",
    true
  );
}
export async function startAbortingInChain(
  chainName: ChainName
): Promise<void> {
  myLogger.warn("Start aborting sync process in chain");
  await setSyncStatusInChain(chainName, "isSyncing", true, "isAbort", true);
}
export async function stopSyncingInChain(chainName: ChainName): Promise<void> {
  myLogger.info("Start stopping sync process in chain");
  await setSyncStatusInChain(chainName, "isSyncing", true, "isAbort", false);
  await setSyncStatusInChain(chainName, "isSyncing", true, "isSyncing", false);
}
export async function stopSyncingInContract(
  dbEventLogs: DbEventLogs,
  contractName: ContractName
): Promise<void> {
  const promiseUpdate: Promise<void>[] = [];
  promiseUpdate.push(
    updateDbItemSyncStatus(dbEventLogs, contractName, "isSyncing", false)
  );
  promiseUpdate.push(
    updateDbItemSyncStatus(dbEventLogs, contractName, "isAbort", false)
  );
  await Promise.all(promiseUpdate);
  myLogger.info(`Stopped syncing of the contract:${contractName}`);
}
async function setSyncStatusInChain<
  T extends keyof SyncStatusContract,
  U extends keyof SyncStatusContract
>(
  chainName: ChainName,
  targetKey: T,
  targetValue: SyncStatusContract[T],
  updateKey: U,
  updateValue: SyncStatusContract[U]
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
      for (const targetSyncStatusContract of await getDbRecordsSyncStatusContractByKeyValue(
        dbEventLogs,
        targetKey,
        targetValue
      )) {
        promiseUpdate.push(
          updateDbItemSyncStatus(
            dbEventLogs,
            targetSyncStatusContract.name,
            updateKey,
            updateValue
          )
        );
      }
    }
  }
  await Promise.all(promiseUpdate);
}

export async function updateDbIsSyncTarget(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  newValue: boolean
) {
  await updateDbItemSyncStatus(
    dbEventLogs,
    contractName,
    "isSyncTarget",
    newValue
  );

  let numOfSyncTargetContract: number = newValue ? 1 : 0;

  await updateDbItemSyncStatus(
    dbEventLogs,
    contractName,
    "numOfSyncTargetContract",
    numOfSyncTargetContract
  );
}

export async function getDbRecordSyncStatusContract(
  dbEventLogs: DbEventLogs,
  contractName: ContractName
): Promise<SyncStatusContract> {
  return await dbEventLogs.transaction("r", tableNameSyncStatus, async () => {
    return await dbEventLogs.table(tableNameSyncStatus).get(contractName);
  });
}
export async function getDbRecordsSyncStatusContractByKeyValue<
  T extends keyof SyncStatusContract
>(
  dbEventLogs: DbEventLogs,
  key: T,
  value: SyncStatusContract[T]
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
  key: T
): Promise<SyncStatusContract[T]> {
  const syncStatusContract: SyncStatusContract =
    await getDbRecordSyncStatusContract(dbEventLogs, contractName);
  return syncStatusContract[key];
}

export async function updateDbItemSyncStatus<
  T extends keyof SyncStatusContract
>(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  key: T,
  newValue: SyncStatusContract[T]
): Promise<void> {
  const contractIdentifier: ContractIdentifier = {
    ...dbEventLogs.versionIdentifier,
    contractName: contractName,
  };
  const newSyncStatusContract: Partial<SyncStatusContract> = {
    [key]: newValue,
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
