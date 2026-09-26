import type { Contract, ContractName } from "@constants/chains/types";
import type { DbEventLogs } from "./dbEventLogs";
import type { Table } from "dexie";
// import type { Event as EthersEvent } from "ethers";
import { getEventLogTableName } from "@utils/utilsDb";
import { assertIsDefined } from "@utils/utilsCommon";
import { customLogger } from "@utils/logger";
import type {
  ConvertedEventLog,
  GroupedEventLogs,
  SyncStatusContract,
  SyncStatusEvent,
  SyncStatusesEvent,
  VersionIdentifier,
} from "./dbTypes";
import { DB_TABLE_NAMES } from "./constants";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import * as itSelf from "./dbEventLogsDataHandlersEventLog";
import { getUpdateTargetEventLogTables } from "./dbEventLogsGetUpdateTargetEventLogTables";
import { getDbItemSyncStatus } from "./dbEventLogsDataHandlersSyncStatusGetters";
//====================== table "eventLogs" =======================
export async function addEventLogs_updateFetchedBlockNumber(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
  groupedEventLogs: GroupedEventLogs,
  toBlockNumber: number,
): Promise<void> {
  const eventLogTables: Table[] = getUpdateTargetEventLogTables(
    dbEventLogs,
    targetContract.name,
    groupedEventLogs,
  );

  const eventLogTableNames = eventLogTables.map((eventLogTable: Table) => {
    return eventLogTable.name;
  });
  const newSyncStatusContract: Partial<SyncStatusContract> = {
    fetchedBlockNumber: toBlockNumber,
  };
  await dbEventLogs.transaction("rw", eventLogTableNames, async () => {
    if (Object.keys(groupedEventLogs).length > 0) {
      const promiseBulkAdds = [];
      const syncStatusesEvent: SyncStatusesEvent = await getDbItemSyncStatus(
        dbEventLogs,
        targetContract.name,
        "events",
      );

      const bulkPutInfo: (VersionIdentifier & {
        contractName: ContractName;
        eventName: string;
        tableName: string;
        numOfRecords: number;
      })[] = [];
      for (const eventName of Object.keys(groupedEventLogs)) {
        const tableName: string = getEventLogTableName(
          targetContract.name,
          eventName,
        );
        const numOfRecords: number = groupedEventLogs[eventName].length;
        // The ranges only move forward, so saving each range in block order
        // keeps the auto-incremented key in block order. The Overview reads
        // the oldest and the latest log by this key (getEventLogEdges).
        promiseBulkAdds.push(
          dbEventLogs
            .table(tableName)
            .bulkPut(
              itSelf.sortEventLogs([...groupedEventLogs[eventName]], "asc"),
            ),
        );
        const syncStatusEvent: SyncStatusEvent | undefined =
          syncStatusesEvent[eventName];
        // The logs are fetched only for the events to sync, which have a status.
        assertIsDefined(syncStatusEvent);
        syncStatusEvent.recordCount += numOfRecords;
        bulkPutInfo.push({
          ...dbEventLogs.versionIdentifier,
          contractName: targetContract.name,
          eventName: eventName,
          tableName: tableName,
          numOfRecords: numOfRecords,
        });
      }
      await Promise.all(promiseBulkAdds);
      if (bulkPutInfo.length)
        customLogger.success("BulkPut Event Logs.", bulkPutInfo);

      newSyncStatusContract.events = syncStatusesEvent;
    }
    await dbEventLogs
      .table(DB_TABLE_NAMES.EventLog.syncStatus)
      .update(targetContract.name, newSyncStatusContract);
  });
  // Update the store only after the commit: the next range starts from the
  // fetchedBlockNumber in the store.
  storeSyncStatus.updateState(
    { ...dbEventLogs.versionIdentifier, contractName: targetContract.name },
    newSyncStatusContract,
  );
}

export async function getEventLogTableRecordCount(
  dbEventLogs: DbEventLogs,
  tableName: string,
): Promise<number> {
  return await dbEventLogs.table(tableName).count();
}
export async function getEventLogTableRecords(
  dbEventLogs: DbEventLogs,
  tableName: string,
  sortModifier: "asc" | "desc" | undefined,
): Promise<ConvertedEventLog[]> {
  let eventLogs: ConvertedEventLog[] = await dbEventLogs
    .table(tableName)
    .toArray();
  if (sortModifier) {
    eventLogs = itSelf.sortEventLogs(eventLogs, sortModifier);
  }
  return eventLogs;
}
export function sortEventLogs(
  convertedEventLogs: ConvertedEventLog[],
  sortModifier: "asc" | "desc",
): ConvertedEventLog[] {
  if (convertedEventLogs) {
    if (sortModifier === "asc") {
      convertedEventLogs.sort((a: ConvertedEventLog, b: ConvertedEventLog) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        } else {
          return a.logIndex - b.logIndex;
        }
      });
    } else {
      convertedEventLogs.sort((a: ConvertedEventLog, b: ConvertedEventLog) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber - a.blockNumber;
        } else {
          return b.logIndex - a.logIndex;
        }
      });
    }
  }
  return convertedEventLogs;
}
