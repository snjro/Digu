import type { Transaction } from "dexie";
import { TARGET_CHAINS } from "@constants/chains/_index";
import {
  initialDataRpcSetting,
  initialDataUserSettings,
  type RpcSetting,
  type SchemaDefinition,
  type UserSetting,
} from "./dbTypes";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "./constants";
import { dbBase } from "./dbBase";
import {
  getDbRecordRpcSettings,
  getDbRecordUserSettings,
} from "./dbSettingsDataHandlers";

export class DbSettings extends dbBase {
  constructor(dbNameForTest?: string) {
    let dbName = DB_NAME.secondNames.settings;
    if (dbNameForTest) {
      dbName += dbNameForTest;
    }

    super(dbName);
    const schemaDefinition: SchemaDefinition = this.getSchemaDefinition();
    this.version(DB_VERSIONS.Settings).stores(schemaDefinition);
    this.on("populate", async (tx: Transaction) => {
      await this.addInitialData(tx);
    });
  }
  protected getSchemaDefinition(): SchemaDefinition {
    const schemaDefinition: SchemaDefinition = {
      [DB_TABLE_NAMES.Settings.rpcSettings]: "chainName" as keyof RpcSetting,
      [DB_TABLE_NAMES.Settings.userSettings]:
        "userSettingsId" as keyof UserSetting,
    };
    return schemaDefinition;
  }
  async addInitialData(tx: Transaction): Promise<void> {
    await Promise.all([
      addInitialDataRpcSettings(tx),
      addInitialDataUserSettings(tx),
    ]);
  }
}
async function addInitialDataRpcSettings(tx: Transaction) {
  const adds: RpcSetting[] = [];
  for (const targetChain of TARGET_CHAINS) {
    if ((await getDbRecordRpcSettings(targetChain.name)) === undefined) {
      adds.push(initialDataRpcSetting(targetChain));
    }
  }
  if (adds.length > 0) {
    await tx.table(DB_TABLE_NAMES.Settings.rpcSettings).bulkAdd(adds);
  }
}
async function addInitialDataUserSettings(tx: Transaction) {
  const adds: UserSetting[] = [];

  if ((await getDbRecordUserSettings("userSetting01")) === undefined) {
    adds.push(initialDataUserSettings());
  }

  if (adds.length > 0) {
    await tx.table(DB_TABLE_NAMES.Settings.userSettings).bulkAdd(adds);
  }
}
export const dbSettings: DbSettings = new DbSettings();
