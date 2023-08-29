import type { Transaction } from "dexie";
import type {
  Contract,
  Version,
  EventAbiFragment,
} from "@constants/chains/types";
import { getEventTableNames, getTargetVersion } from "@utils/utlisDb";
import { dbBase } from "./dbBase";
import type {
  SchemaDefinition,
  SyncStatusesEvent,
  VersionIdentifier,
} from "@db/dbTypes";
import {
  DB_NAME,
  DB_TABLE_NAMES,
  DB_VERSIONS,
  PK_AUTO_INCREMENTED,
} from "@db/constants";
import type { SyncStatusContract } from "@db/dbTypes";
import { extractEventContracts } from "@utils/utilsEthers";
import { NO_DATA } from "@utils/utilsCostants";

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
  protected async addInitialData(
    tx: Transaction,
    targetContracts: Contract[],
  ): Promise<void> {
    const ArrayOfInitialData = [];
    for (const targetContract of targetContracts) {
      const initialData: SyncStatusContract =
        getInitialDataOfSyncStatusContract(targetContract);
      ArrayOfInitialData.push(initialData);
    }
    await tx
      .table(DB_TABLE_NAMES.EventLog.syncStatus)
      .bulkAdd(ArrayOfInitialData);
  }
}

function getInitialDataOfSyncStatusContract(
  targetContract: Contract,
): SyncStatusContract {
  const creationBlockNumber: number = targetContract.creation.blockNumber;
  return {
    name: targetContract.name,
    isSyncTarget: true,
    isSyncing: false,
    isAbort: false,
    fetchedBlockNumber: creationBlockNumber - 1,
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
  for (let eventName of eventNames) {
    syncStatusesEvent[eventName] = { recordCount: 0 };
  }
  return syncStatusesEvent;
}
