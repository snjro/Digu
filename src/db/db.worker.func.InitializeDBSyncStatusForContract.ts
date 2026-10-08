import type { Contract, EventAbiFragment } from "#constants/chains/types.js";
import { getSyncStatusReset, type SyncStatusesEvent } from "./dbTypes";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import { getEventLogTableName } from "#utils/utilsDb.js";
import { getEventLogTableRecordCount } from "./dbEventLogsDataHandlersEventLog";
import type { DbEventLogs } from "./dbEventLogs";

// At startup, the record counts are counted from the event log tables:
// afterwards they are added in the same transaction as the logs.
export async function initializeDBSyncStatusForContract(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
): Promise<void> {
  await updateDbRecordSyncStatus(dbEventLogs, targetContract.name, {
    ...getSyncStatusReset(targetContract),
    events: await getSyncStatusesEvent(dbEventLogs, targetContract),
  });
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
