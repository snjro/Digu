import { getEventLogTableName } from "@utils/utlisDb";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import { getEventLogTableRecords } from "./dbEventLogsDataHandlersEventLog";

export async function dbWorkerFuncGetConvertedEventLogs(
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
