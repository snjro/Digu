import type { Chain, ChainName, ContractName } from "@constants/chains/types";
import { DbEventLogs } from "./dbEventLogs";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";
import { getTargetChain } from "@utils/utlisDb";
import { getDbRecordsSyncStatusContractByKeyValue } from "./dbEventLogsDataHandlersSyncStatusGetters";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdatersDbRecordSyncStatus";

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
      for (const targetSyncStatusContract of await getDbRecordsSyncStatusContractByKeyValue(
        dbEventLogs,
        targetKey,
        targetValue,
      )) {
        promiseUpdate.push(
          updateDbItemSyncStatus(
            dbEventLogs,
            targetSyncStatusContract.name,
            updateKey,
            updateValue,
          ),
        );
      }
    }
  }
  await Promise.all(promiseUpdate);
}

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
