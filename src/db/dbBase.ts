import type { Contract } from "@constants/chains/types";
import { Dexie, type Transaction } from "dexie";
// import type { Transaction } from "dexie";
import { DB_NAME } from "./constants";
import type { SchemaDefinition, VersionIdentifier } from "./dbTypes";

export abstract class dbBase extends Dexie {
  constructor(dbNameElement: string[] | string) {
    const dbName = getDbName(dbNameElement);
    super(dbName);
  }
  protected abstract getSchemaDefinition(
    targetContracts?: Contract[],
    versionIdentifier?: VersionIdentifier,
  ): SchemaDefinition;
  protected abstract addInitialData(
    tx: Transaction,
    targetContracts?: Contract[],
  ): Promise<void>;
}
function getDbName(dbNameElement: string[] | string): string {
  if (!Array.isArray(dbNameElement)) {
    dbNameElement = [dbNameElement];
  }
  dbNameElement.unshift(DB_NAME.firstName);
  return dbNameElement.join("_");
}
