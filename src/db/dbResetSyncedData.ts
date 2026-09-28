import type { Chain, Contract, Version } from "@constants/chains/types";
import { getEventTableNames } from "@utils/utilsDb";
import { extractEventContracts } from "@utils/utilsEthers";
import type { Table } from "dexie";
import { DB_TABLE_NAMES } from "./constants";
import { dbBlockTimes } from "./dbBlockTimes";
import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import { getInitialDataOfSyncStatusContract } from "./dbEventLogsAddInitialData";
import type { SyncStatusContract } from "./dbTypes";

// Empties the tables instead of deleting the DBs, so that the open
// connections of this tab and the other tabs stay usable. Call only while
// holding the sync lock of the chain. Returns the number of event logs it
// deleted.
export async function resetDbSyncedData(targetChain: Chain): Promise<number> {
  let deletedLogCount: number = 0;
  for (const targetProject of targetChain.projects) {
    for (const targetVersion of targetProject.versions) {
      deletedLogCount += await resetDbEventLogs(
        getDbEventLogs({
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        }),
        targetVersion,
      );
    }
  }
  await dbBlockTimes.transaction("rw", targetChain.name, async () => {
    await dbBlockTimes.table(targetChain.name).clear();
  });
  return deletedLogCount;
}

// One transaction for each version, so that its logs and fetchedBlockNumber
// agree even when a later version fails.
async function resetDbEventLogs(
  dbEventLogs: DbEventLogs,
  targetVersion: Version,
): Promise<number> {
  const targetContracts: Contract[] = extractEventContracts(
    targetVersion.contracts,
  );
  const syncStatusTable: Table<SyncStatusContract, string> = dbEventLogs.table(
    DB_TABLE_NAMES.EventLog.syncStatus,
  );
  const eventTables: Table[] = getEventTableNames(targetContracts).map(
    (eventTableName: string) => dbEventLogs.table(eventTableName),
  );
  return await dbEventLogs.transaction(
    "rw",
    [syncStatusTable, ...eventTables],
    async (): Promise<number> => {
      const counts: number[] = await Promise.all(
        eventTables.map((eventTable) => eventTable.count()),
      );
      await Promise.all(eventTables.map((eventTable) => eventTable.clear()));
      const records: (SyncStatusContract | undefined)[] =
        await syncStatusTable.bulkGet(
          targetContracts.map((targetContract) => targetContract.name),
        );
      await syncStatusTable.bulkPut(
        targetContracts.map((targetContract: Contract, index: number) => {
          const initialData: SyncStatusContract =
            getInitialDataOfSyncStatusContract(targetContract);
          const record: SyncStatusContract | undefined = records[index];
          // The contracts to sync are a choice of the user: keep them.
          return {
            ...initialData,
            isSyncTarget: record?.isSyncTarget ?? initialData.isSyncTarget,
            numOfSyncTargetContract:
              record?.numOfSyncTargetContract ??
              initialData.numOfSyncTargetContract,
          };
        }),
      );
      return counts.reduce((sum: number, count: number) => sum + count, 0);
    },
  );
}
