import type { Transaction } from "dexie";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "./constants";
import { dbBase } from "./dbBase";
import {
  initialDataRpcSetting,
  initialDataUserSettings,
  type RpcSetting,
  type SchemaDefinition,
  type UserSetting,
} from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { ChainName } from "@constants/chains/types";
import * as itSelf from "./dbSettings"; // "itSelf" is needed for mocking exported function. Ref: //https://stackoverflow.com/questions/51269431/jest-mock-inner-function
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeUserSettings } from "@stores/storeUserSettings";

const tableNameRpcSettings = DB_TABLE_NAMES.Settings.rpcSettings;
const tableNameUserSettings = DB_TABLE_NAMES.Settings.userSettings;

class DbSettings extends dbBase {
  constructor() {
    const dbName = DB_NAME.secondNames.settings;
    super(dbName);
    const schemaDefinition: SchemaDefinition = this.getSchemaDefinition();
    this.version(DB_VERSIONS.Settings).stores(schemaDefinition);
    this.on("populate", async (tx: Transaction) => {
      await this.addInitialData(tx);
    });
  }
  protected getSchemaDefinition(): SchemaDefinition {
    const schemaDefinition: SchemaDefinition = {
      [tableNameRpcSettings]: "chainName" as keyof RpcSetting,
      [tableNameUserSettings]: "userSettingsId" as keyof UserSetting,
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
export const dbSettings: DbSettings = new DbSettings();

export async function addInitialDataRpcSettings(
  tx: Transaction,
): Promise<void> {
  const adds: RpcSetting[] = [];
  for (const targetChain of TARGET_CHAINS) {
    if ((await itSelf.getDbRecordRpcSettings(targetChain.name)) === undefined) {
      adds.push(initialDataRpcSetting(targetChain));
    }
  }
  if (adds.length > 0) {
    await tx.table(tableNameRpcSettings).bulkAdd(adds);
  }
}
export async function addInitialDataUserSettings(
  tx: Transaction,
): Promise<void> {
  const adds: UserSetting[] = [];
  if ((await itSelf.getDbRecordUserSettings("userSetting01")) === undefined) {
    adds.push(initialDataUserSettings);
  }

  if (adds.length > 0) {
    await tx.table(tableNameUserSettings).bulkAdd(adds);
  }
}

export async function addInitialDataOfDbSettings(): Promise<void> {
  await dbSettings.transaction(
    "rw",
    dbSettings.table(tableNameRpcSettings),
    dbSettings.table(tableNameUserSettings),
    async (tx) => {
      await dbSettings.addInitialData(tx);
    },
  );
}

export async function getDbRecordRpcSettings(
  chainName: ChainName,
): Promise<RpcSetting | undefined> {
  return await dbSettings.transaction("r", tableNameRpcSettings, async () => {
    const rpcSetting: RpcSetting | undefined = await dbSettings
      .table(tableNameRpcSettings)
      .get(chainName);

    return rpcSetting;
  });
}
export async function getDbItemRpcSettings<T extends keyof RpcSetting>(
  chainName: ChainName,
  key: T,
): Promise<RpcSetting[T] | undefined> {
  const rpcSetting: RpcSetting | undefined =
    await itSelf.getDbRecordRpcSettings(chainName);
  return rpcSetting ? rpcSetting[key] : undefined;
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

export async function getDbRecordUserSettings(
  userSettingsId: UserSetting["userSettingsId"],
): Promise<UserSetting | undefined> {
  return await dbSettings.transaction("r", tableNameUserSettings, async () => {
    const userSettings: UserSetting | undefined = await dbSettings
      .table(tableNameUserSettings)
      .get(userSettingsId);

    return userSettings;
  });
}
export async function getDbItemUserSettings<T extends keyof UserSetting>(
  userSettingsId: UserSetting["userSettingsId"],
  key: T,
): Promise<UserSetting[T] | undefined> {
  const userSetting: UserSetting | undefined =
    await itSelf.getDbRecordUserSettings(userSettingsId);
  return userSetting ? userSetting[key] : undefined;
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
