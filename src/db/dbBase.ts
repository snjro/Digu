import type { Contract } from "#constants/chains/types.js";
import { Dexie, type Transaction } from "dexie";
import { DB_NAME } from "./constants";
import type { SchemaDefinition } from "./dbTypes";

export abstract class dbBase extends Dexie {
  constructor(dbNameElement: string[] | string) {
    const dbName = getDbName(dbNameElement);
    super(dbName);
  }
  protected abstract getSchemaDefinition(
    targetContracts?: Contract[],
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
  return [DB_NAME.firstName, ...dbNameElement].join("_");
}
