import type { Transaction } from "dexie";
import type { ChainName } from "@constants/chains/types";
import { dbBase } from "./dbBase";
import type { ChainStatus, SchemaDefinition } from "@db/dbTypes";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "@db/constants";
import { TARGET_CHAINS } from "@constants/chains/_index";

class DbChainStatus extends dbBase {
  constructor() {
    //define DB name
    super(DB_NAME.secondNames.chainStatus);
    //define DB schema
    const schemaDefinition = this.getSchemaDefinition();
    this.version(DB_VERSIONS.ChainStatus).stores(schemaDefinition);

    //add initialData
    this.on("populate", async (tx: Transaction) => {
      await this.addInitialData(tx);
    });
  }
  protected getSchemaDefinition(): SchemaDefinition {
    const schemaDefinition: SchemaDefinition = {};

    schemaDefinition[DB_TABLE_NAMES.ChainStatus] = "chainName";

    return schemaDefinition;
  }
  protected async addInitialData(tx: Transaction): Promise<void> {
    const ArrayOfInitialData = [];
    for (const targetChain of TARGET_CHAINS) {
      ArrayOfInitialData.push(initialDataChainStatus(targetChain.name));
    }
    await tx.table(DB_TABLE_NAMES.ChainStatus).bulkAdd(ArrayOfInitialData);
  }
}
export const dbChainStatus: DbChainStatus = new DbChainStatus();
export const initialDataChainStatus = (chainName: ChainName): ChainStatus => {
  return {
    chainName: chainName,
    latestBlockNumber: 0,
    nodeStatus: undefined,
  };
};
