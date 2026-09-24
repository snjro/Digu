import type { Contract, EventAbiFragment } from "@constants/chains/types";
import type { SyncStatusContract, SyncStatusesEvent } from "./dbTypes";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import { getEventLogTableName } from "@utils/utlisDb";
import { getEventLogTableRecordCount } from "./dbEventLogsDataHandlersEventLog";
import type { DbEventLogs } from "./dbEventLogs";

// With `recount`, the record counts are counted from the event log tables.
// Without it, the counts in the DB are kept: they are added in the same
// transaction as the logs, so only the startup recounts them.
export async function initializeDBSyncStatusForContract(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  recount: boolean,
): Promise<void> {
  const newSyncStatusContract: Partial<SyncStatusContract> = {
    isAbort: false,
    isSyncing: false,
    creationBlockNumber: targetContract.creation.blockNumber,
  };
  if (recount) {
    newSyncStatusContract.events = await getSyncStatusesEvent(
      dbEventLogs,
      targetContract,
    );
  }

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
  const promises: Promise<Partial<SyncStatusesEvent>>[] = [];
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
