import type { Contract, EventAbiFragment } from "@constants/chains/types";
import type { SyncStatusContract, SyncStatusesEvent } from "./dbTypes";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdaters";
import { getEventLogTableName } from "@utils/utlisDb";
import { getEventLogTableRecordCount } from "./dbEventLogsDataHandlersEventLog";
import type { DbEventLogs } from "./dbEventLogs";

export async function initializeDBSyncStatusForContract(
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
