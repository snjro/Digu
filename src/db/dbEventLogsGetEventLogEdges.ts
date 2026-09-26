import type { Table } from "dexie";
import { getEventLogTableName } from "@utils/utilsDb";
import type { AbiFragmentIdentifier, ConvertedEventLog } from "./dbTypes";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";

export type EventLogEdges = {
  count: number;
  oldest: ConvertedEventLog | undefined;
  latest: ConvertedEventLog | undefined;
};

// Reads the number of logs and the two edge logs, not all the logs.
// The sync saves the logs of each range in block and log index order
// (addEventLogs_updateFetchedBlockNumber) and the ranges from old to new
// blocks, so the order of the auto-incremented key is the order of the blocks.
export async function getEventLogEdges(
  eventIdentifier: AbiFragmentIdentifier,
): Promise<EventLogEdges> {
  const dbEventLogs: DbEventLogs = getDbEventLogs({
    chainName: eventIdentifier.chainName,
    projectName: eventIdentifier.projectName,
    versionName: eventIdentifier.versionName,
  });
  const table: Table<ConvertedEventLog> = dbEventLogs.table(
    getEventLogTableName(
      eventIdentifier.contractName,
      eventIdentifier.abiFragmentName,
    ),
  );
  return await dbEventLogs.transaction("r", table, async () => {
    const [count, oldest, latest] = await Promise.all([
      table.count(),
      table.orderBy(":id").first(),
      table.orderBy(":id").last(),
    ]);
    return { count, oldest, latest };
  });
}
