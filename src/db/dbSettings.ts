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
import type { ChainName } from "@constants/chains/types";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeUserSettings } from "@stores/storeUserSettings";

class DbSettings extends dbBase {
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
    if (
      (await DbSettingsDataHandlers.getDbRecordRpcSettings(
        targetChain.name,
      )) === undefined
    ) {
      adds.push(initialDataRpcSetting(targetChain));
    }
  }
  if (adds.length > 0) {
    await tx.table(DB_TABLE_NAMES.Settings.rpcSettings).bulkAdd(adds);
  }
}
async function addInitialDataUserSettings(tx: Transaction) {
  const adds: UserSetting[] = [];

  if (
    (await DbSettingsDataHandlers.getDbRecordUserSettings("userSetting01")) ===
    undefined
  ) {
    adds.push(initialDataUserSettings());
  }

  if (adds.length > 0) {
    await tx.table(DB_TABLE_NAMES.Settings.userSettings).bulkAdd(adds);
  }
}
export const dbSettings: DbSettings = new DbSettings();

export namespace DbSettingsDataHandlers {
  const tableNameRpcSettings = DB_TABLE_NAMES.Settings.rpcSettings;
  const tableNameUserSettings = DB_TABLE_NAMES.Settings.userSettings;

  export async function getDbRecordRpcSettings(
    chainName: ChainName,
  ): Promise<RpcSetting> {
    return await dbSettings.transaction("r", tableNameRpcSettings, async () => {
      const rpcSetting: RpcSetting = await dbSettings
        .table(tableNameRpcSettings)
        .get(chainName);

      return rpcSetting;
    });
  }
  export async function getDbItemRpcSettings<T extends keyof RpcSetting>(
    chainName: ChainName,
    key: T,
  ): Promise<RpcSetting[T]> {
    const rpcSetting: RpcSetting = await getDbRecordRpcSettings(chainName);
    return rpcSetting[key];
  }
  export async function updateDbItemRpcSettings<T extends keyof RpcSetting>(
    chainName: ChainName,
    key: T,
    newValue: RpcSetting[T],
  ): Promise<void> {
    await dbSettings
      .transaction("rw", tableNameRpcSettings, async () => {
        //update table
        await dbSettings
          .table(tableNameRpcSettings)
          .update(chainName, { [key]: newValue });
      })
      .then(() => {
        //update store
        storeRpcSettings.updateState(chainName, { [key]: newValue });
      });
  }

  ////////////////////////////////////////////////////
  export async function getDbRecordUserSettings(
    userSettingsId: UserSetting["userSettingsId"],
  ): Promise<UserSetting> {
    return await dbSettings.transaction(
      "r",
      tableNameUserSettings,
      async () => {
        const userSettings: UserSetting = await dbSettings
          .table(tableNameUserSettings)
          .get(userSettingsId);

        return userSettings;
      },
    );
  }
  export async function getDbItemUserSettings<T extends keyof UserSetting>(
    userSettingsId: UserSetting["userSettingsId"],
    key: T,
  ): Promise<UserSetting[T]> {
    const userSetting: UserSetting =
      await getDbRecordUserSettings(userSettingsId);
    return userSetting[key];
  }

  export async function updateDbItemUserSettings<T extends keyof UserSetting>(
    key: T,
    newValue: UserSetting[T],
  ): Promise<void> {
    await dbSettings
      .transaction("rw", tableNameUserSettings, async () => {
        //update table
        await dbSettings
          .table(tableNameUserSettings)
          .update("userSetting01", { [key]: newValue });
      })
      .then(() => {
        //update store
        storeUserSettings.updateState({ [key]: newValue });
      });
  }
  ////////////////////////////////////////////////////
  export async function addInitialData() {
    await dbSettings.transaction(
      "rw",
      dbSettings.table(tableNameRpcSettings),
      dbSettings.table(tableNameUserSettings),
      async (tx) => {
        await dbSettings.addInitialData(tx);
      },
    );
  }
}
