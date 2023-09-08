import type { Contract, EventAbiFragment } from "@constants/chains/types";
import { DbEventLogs } from "./dbEventLogs";
import type {
  SyncStatusContract,
  SyncStatusesEvent,
  VersionIdentifier,
} from "./dbTypes";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatus";
import { getEventLogTableName } from "@utils/utlisDb";
import { getEventLogTableRecordCount } from "./dbEventLogsDataHandlersEventLog";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { extractEventContracts } from "@utils/utilsEthers";
import { myLogger } from "@utils/logger";
import { DbSettingsDataHandlers } from "./dbSettings";

export type DbWorkerMessage = {
  targetFunctionName: "initializeDBSyncStatus" | "initializeDbSettings";
};
addEventListener("message", async (event: MessageEvent<DbWorkerMessage>) => {
  const targetFunctionName: DbWorkerMessage["targetFunctionName"] =
    event.data.targetFunctionName;

  myLogger.start(`${targetFunctionName} start by DB worker`);

  switch (targetFunctionName) {
    case "initializeDBSyncStatus":
      await initializeDBSyncStatus();
      break;
    case "initializeDbSettings":
      await DbSettingsDataHandlers.addInitialData();
      break;
    default:
      break;
  }
  postMessage(`${targetFunctionName} end by DB worker`);
});

async function initializeDBSyncStatus(): Promise<void> {
  const promises: Promise<void>[] = [];
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
          promises.push(
            initializeDBSyncStatusForContract(dbEventLogs, targetContract),
          );
        }
      }
    }
  }
  await Promise.all(promises);
}

async function initializeDBSyncStatusForContract(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
): Promise<void> {
  const syncStatusesEvent: SyncStatusesEvent = await getSyncStatusesEvent(
    dbEventLogs,
    targetContract,
  );

  const newSyncStatusContract: Partial<SyncStatusContract> = {
    isAbort: false,
    isSyncing: false,
    creationBlockNumber: targetContract.creation.blockNumber,
    events: syncStatusesEvent,
  };

  await updateDbRecordSyncStatus(
    dbEventLogs,
    targetContract.name,
    newSyncStatusContract,
  );
}
async function getSyncStatusesEvent(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
): Promise<SyncStatusesEvent> {
  let promises: Promise<Partial<SyncStatusesEvent>>[] = [];
  for (const eventName of targetContract.events.names) {
    promises.push(
      getRecordCountOfEventLogs(dbEventLogs, targetContract, eventName),
    );
  }
  const partialSyncStatusesEvent: Partial<SyncStatusesEvent>[] =
    await Promise.all(promises);

  return Object.assign({}, ...partialSyncStatusesEvent);
}
async function getRecordCountOfEventLogs(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  eventName: EventAbiFragment["name"],
): Promise<Partial<SyncStatusesEvent>> {
  const eventLogTableName: string = getEventLogTableName(
    targetContract.name,
    eventName,
  );

  const recordCount: number = await getEventLogTableRecordCount(
    dbEventLogs,
    eventLogTableName,
  );

  return { [eventName]: { recordCount: recordCount } };
}
