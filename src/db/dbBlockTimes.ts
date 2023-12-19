import type { SchemaDefinition } from "./dbTypes";
import { DB_NAME, DB_VERSIONS } from "./constants";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { dbBase } from "./dbBase";

const TABLE_BLOCKTIMES_COLUMN_NAMES = {
  blockNumber: "blockNumber",
} as const;

class DbBlockTimes extends dbBase {
  constructor() {
    const dbName = DB_NAME.secondNames.blockTimes;
    super(dbName);
    const schemaDefinition: SchemaDefinition = this.getSchemaDefinition();
    this.version(DB_VERSIONS.BlockTimes).stores(schemaDefinition);
  }
  protected getSchemaDefinition(): SchemaDefinition {
    const schemaDefinition: SchemaDefinition = {};

    for (const targetChain of TARGET_CHAINS) {
      schemaDefinition[targetChain.name] =
        TABLE_BLOCKTIMES_COLUMN_NAMES.blockNumber;
    }
    return schemaDefinition;
  }
  addInitialData(): Promise<void> {
    return Promise.resolve();
  }
}
export const dbBlockTimes = new DbBlockTimes();
