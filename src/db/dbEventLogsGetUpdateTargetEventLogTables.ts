import type { ContractName } from "@constants/chains/types";
import type { DbEventLogs } from "./dbEventLogs";
import type { Table } from "dexie";
import { getEventLogTableName } from "@utils/utlisDb";
import { DB_TABLE_NAMES } from "./constants";

import type { GroupedEventLogs } from "./dbTypes";

export function getUpdateTargetEventLogTables(
  dbEventLogs: DbEventLogs,
  contractName: ContractName,
  groupedEventLogs: GroupedEventLogs,
): Table[] {
  const eventNames: string[] = Object.keys(groupedEventLogs);

  // get eventLog table(s)
  const updateTargetEventLogTables: Table[] = eventNames.map((eventName) => {
    const tableName: string = getEventLogTableName(contractName, eventName);
    return dbEventLogs.table(tableName);
  });

  // get syncStatus table.
  // ∵ when eventLog table(s) is/are updated, syncStatus table needs to be updated.
  updateTargetEventLogTables.push(
    dbEventLogs.table(DB_TABLE_NAMES.EventLog.syncStatus),
  );

  return updateTargetEventLogTables;
}
