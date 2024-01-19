import type { Chain, ChainName, ContractName } from "@constants/chains/types";
import { DbEventLogs } from "./dbEventLogs";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";
import { customLogger } from "@utils/logger";
import { getTargetChain } from "@utils/utlisDb";
import { getDbRecordsSyncStatusContractByKeyValue } from "./dbEventLogsDataHandlersSyncStatusGetters";
import { updateDbItemSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdaters";

export async function startSyncingInChain(chainName: ChainName): Promise<void> {
  await setSyncStatusInChain(
    chainName,
    "isSyncTarget",
    true,
    "isSyncing",
    true,
  );
}
export async function startAbortingInChain(
  chainName: ChainName,
): Promise<void> {
  const log = `Update syncStaus for aborting. Chain: ${chainName}`;
  customLogger.start(log);
  await setSyncStatusInChain(chainName, "isSyncing", true, "isAbort", true);
  customLogger.finished(log);
}
export async function stopSyncingInChain(chainName: ChainName): Promise<void> {
  const log: string = `Update syncStatus for stopping. Chain: ${chainName}`;
  customLogger.start(log);
  await setSyncStatusInChain(chainName, "isSyncing", true, "isAbort", false);
  await setSyncStatusInChain(chainName, "isSyncing", true, "isSyncing", false);
  customLogger.finished(log);
}
export async function stopSyncingInContract(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
): Promise<void> {
  const promiseUpdate: Promise<void>[] = [];
  const log: string = `Update syncStatus for stopping. Contract: ${contractName}`;
  customLogger.start(log);
  promiseUpdate.push(
    updateDbItemSyncStatus(dbEventLogs, contractName, "isSyncing", false),
  );
  promiseUpdate.push(
    updateDbItemSyncStatus(dbEventLogs, contractName, "isAbort", false),
  );
  await Promise.all(promiseUpdate);
  customLogger.finished(log);
}
async function setSyncStatusInChain<
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
