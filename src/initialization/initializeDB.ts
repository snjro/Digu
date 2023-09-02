import type { SyncStatusesEvent, VersionIdentifier } from "@db/dbTypes";
import type { Contract } from "@constants/chains/types";
import { DbEventLogs } from "@db/dbEventLogs";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { updateDbItemSyncStatus } from "@db/dbEventLogsDataHandlersSyncStatus";
import { getEventLogTableName } from "@utils/utlisDb";
import { getEventLogTableRecordCount } from "@db/dbEventLogsDataHandlersEventLog";
import { extractEventContracts } from "@utils/utilsEthers";
import { DbSettingsDataHandlers } from "@db/dbSettings";

export async function initializeDB(): Promise<void> {
  const promises: Promise<void>[] = [];
  promises.push(initializeDBSettings());
  for (const targetChain of TARGET_CHAINS) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
          promises.push(initializeDBSyncStatus(dbEventLogs, targetContract));
        }
      }
    }
  }
  await Promise.all(promises);
}
async function initializeDBSyncStatus(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
): Promise<void> {
  const promises: Promise<void>[] = [];
  promises.push(
    updateDbItemSyncStatus(dbEventLogs, targetContract.name, "isAbort", false),
  );
  promises.push(
    updateDbItemSyncStatus(
      dbEventLogs,
      targetContract.name,
      "isSyncing",
      false,
    ),
  );
  promises.push(
    updateDbItemSyncStatus(
      dbEventLogs,
      targetContract.name,
      "creationBlockNumber",
      targetContract.creation.blockNumber,
    ),
  );
  promises.push(updateRecordCount(dbEventLogs, targetContract));
  await Promise.all(promises);
  // await updateDbItemSyncStatus(dbEventLogs, targetContract.name, 'isAbort', false);
  // await updateDbItemSyncStatus(dbEventLogs, targetContract.name, 'isSyncing', false);
  // await updateDbItemSyncStatus(
  //   dbEventLogs,
  //   targetContract.name,
  //   'creationBlockNumber',
  //   targetContract.creation.blockNumber
  // );
  // await updateRecordCount(dbEventLogs, targetContract);
}
async function initializeDBSettings(): Promise<void> {
  await DbSettingsDataHandlers.addInitialData();
}
async function updateRecordCount(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
): Promise<void> {
  const syncStatusesEvent: SyncStatusesEvent = {};

  for (const eventName of targetContract.events.names) {
    syncStatusesEvent[eventName] = {
      recordCount: await getEventLogTableRecordCount(
        dbEventLogs,
        getEventLogTableName(targetContract.name, eventName),
      ),
    };
  }
  await updateDbItemSyncStatus(
    dbEventLogs,
    targetContract.name,
    "events",
    syncStatusesEvent,
  );
}
