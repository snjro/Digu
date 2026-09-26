import type { Transaction } from "dexie";
import type { Contract, Version } from "@constants/chains/types";
import { getEventTableNames, getTargetVersion } from "@utils/utilsDb";
import { dbBase } from "./dbBase";
import type { SchemaDefinition, VersionIdentifier } from "@db/dbTypes";
import {
  DB_NAME,
  DB_TABLE_NAMES,
  DB_VERSIONS,
  PK_AUTO_INCREMENTED,
} from "@db/constants";
import type { SyncStatusContract } from "@db/dbTypes";
import { extractEventContracts } from "@utils/utilsEthers";
import { getInitialDataOfSyncStatusContract } from "./dbEventLogsAddInitialData";

export class DbEventLogs extends dbBase {
  versionIdentifier: VersionIdentifier;
  constructor(versionIdentifier: VersionIdentifier) {
    const targetVersion: Version = getTargetVersion(versionIdentifier);
    const targetContracts: Contract[] = extractEventContracts(
      targetVersion.contracts,
    );

    //define DB name
    const dbNameElement: string[] = Object.values(versionIdentifier);
    dbNameElement.unshift(DB_NAME.secondNames.eventLog);
    super(dbNameElement);

    //define DB schema
    const schemaDefinition = this.getSchemaDefinition(targetContracts);
    this.version(DB_VERSIONS.EventLog).stores(schemaDefinition);

    //add initialData
    this.on("populate", async (tx: Transaction) => {
      await this.addInitialData(tx, targetContracts);
    });
    this.versionIdentifier = versionIdentifier;
  }
  protected getSchemaDefinition(targetContracts: Contract[]): SchemaDefinition {
    const schemaDefinition: SchemaDefinition = {};

    const eventTableNames: string[] = getEventTableNames(targetContracts);
    for (const eventTableName of eventTableNames) {
      schemaDefinition[eventTableName] = PK_AUTO_INCREMENTED;
    }
    schemaDefinition[DB_TABLE_NAMES.EventLog.syncStatus] = "name";

    return schemaDefinition;
  }
  // Adds only the missing rows: "populate" does not run for the contracts
  // added after the DB was created.
  async addInitialData(
    tx: Transaction,
    targetContracts: Contract[],
  ): Promise<void> {
    const table = tx.table(DB_TABLE_NAMES.EventLog.syncStatus);
    const records: (SyncStatusContract | undefined)[] = await table.bulkGet(
      targetContracts.map((targetContract) => targetContract.name),
    );
    const arrayOfInitialData: SyncStatusContract[] = targetContracts
      .filter((_, index) => records[index] === undefined)
      .map((targetContract) =>
        getInitialDataOfSyncStatusContract(targetContract),
      );
    if (arrayOfInitialData.length > 0) {
      await table.bulkAdd(arrayOfInitialData);
    }
  }
}

// One instance per version, so that the page keeps one connection per version
// open. Do not close() it: a closed instance does not reopen.
const dbEventLogsByVersion: Map<string, DbEventLogs> = new Map();
export function getDbEventLogs(
  versionIdentifier: VersionIdentifier,
): DbEventLogs {
  const { chainName, projectName, versionName } = versionIdentifier;
  const key: string = JSON.stringify([chainName, projectName, versionName]);
  let dbEventLogs: DbEventLogs | undefined = dbEventLogsByVersion.get(key);
  if (!dbEventLogs) {
    // Only the three names: the DB name is made from the values.
    dbEventLogs = new DbEventLogs({ chainName, projectName, versionName });
    dbEventLogsByVersion.set(key, dbEventLogs);
  }
  return dbEventLogs;
}

export async function addInitialDataOfDbEventLogs(
  dbEventLogs: DbEventLogs,
): Promise<void> {
  const targetContracts: Contract[] = extractEventContracts(
    getTargetVersion(dbEventLogs.versionIdentifier).contracts,
  );
  await dbEventLogs.transaction(
    "rw",
    DB_TABLE_NAMES.EventLog.syncStatus,
    async (tx) => {
      await dbEventLogs.addInitialData(tx, targetContracts);
    },
  );
}
