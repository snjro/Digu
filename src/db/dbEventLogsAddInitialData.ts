import type { Contract, EventAbiFragment } from "@constants/chains/types";
import type { SyncStatusesEvent } from "@db/dbTypes";
import type { SyncStatusContract } from "@db/dbTypes";
import { NO_DATA } from "@utils/utilsCostants";

export function getInitialDataOfSyncStatusContract(
  targetContract: Contract,
): SyncStatusContract {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  return {
    name: targetContract.name,
    isSyncTarget: true,
    isSyncing: false,
    isAbort: false,
    fetchedBlockNumber: creationBlockNumber,
    creationBlockNumber: creationBlockNumber,
    numOfSyncTargetContract: 1,
    syncStateText: NO_DATA,
    subSyncStatuses: null,
    events: getInitialDataOfSyncStatusesEvent(targetContract.events.names),
  };
}
export function getInitialDataOfSyncStatusesEvent(
  eventNames: EventAbiFragment["name"][],
): SyncStatusesEvent {
  const syncStatusesEvent: SyncStatusesEvent = {};
  for (const eventName of eventNames) {
    syncStatusesEvent[eventName] = { recordCount: 0 };
  }
  return syncStatusesEvent;
}
