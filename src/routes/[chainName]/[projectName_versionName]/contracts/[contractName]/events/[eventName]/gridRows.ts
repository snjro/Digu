import { DbEventLogs } from "@db/dbEventLogs";
import { getEventLogTableRecords } from "@db/dbEventLogsDataHandlersEventLog";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "@db/dbTypes";
import { getEventLogTableName } from "@utils/utlisDb";

export async function gridRows(
  eventIdentifier: AbiFragmentIdentifier,
): Promise<ConvertedEventLog[]> {
  const eventLogTableName: string = getEventLogTableName(
    eventIdentifier.contractName,
    eventIdentifier.abiFragmentName,
  );

  const dbEventLogs: DbEventLogs = new DbEventLogs({
    chainName: eventIdentifier.chainName,
    projectName: eventIdentifier.projectName,
    versionName: eventIdentifier.versionName,
  });

  const eventLogRows: ConvertedEventLog[] = await getEventLogTableRecords(
    dbEventLogs,
    eventLogTableName,
    "asc",
  );
  return eventLogRows;
}
