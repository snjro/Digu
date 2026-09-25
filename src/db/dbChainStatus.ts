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
  // Adds only the missing rows: "populate" does not run for the chains added
  // after the DB was created.
  async addInitialData(tx: Transaction): Promise<void> {
    const table = tx.table(DB_TABLE_NAMES.ChainStatus);
    const records: (ChainStatus | undefined)[] = await table.bulkGet(
      TARGET_CHAINS.map((targetChain) => targetChain.name),
    );
    const ArrayOfInitialData: ChainStatus[] = TARGET_CHAINS.filter(
      (_, index) => records[index] === undefined,
    ).map((targetChain) => initialDataChainStatus(targetChain.name));
    if (ArrayOfInitialData.length > 0) {
      await table.bulkAdd(ArrayOfInitialData);
    }
  }
}
export const dbChainStatus: DbChainStatus = new DbChainStatus();

export async function addInitialDataOfDbChainStatus(): Promise<void> {
  await dbChainStatus.transaction(
    "rw",
    DB_TABLE_NAMES.ChainStatus,
    async (tx) => {
      await dbChainStatus.addInitialData(tx);
    },
  );
}
export const initialDataChainStatus = (chainName: ChainName): ChainStatus => {
  return {
    chainName: chainName,
    latestBlockNumber: 0,
    nodeStatus: undefined,
  };
};
