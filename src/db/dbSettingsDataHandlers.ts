import type { ChainName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { dbSettings } from "./dbSettings";
import type { RpcSetting, UserSetting } from "./dbTypes";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { storeUserSettings } from "@stores/storeUserSettings";

const tableNameRpcSettings = DB_TABLE_NAMES.Settings.rpcSettings;
const tableNameUserSettings = DB_TABLE_NAMES.Settings.userSettings;

export async function getDbRecordRpcSettings(
  chainName: ChainName
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
  key: T
): Promise<RpcSetting[T]> {
  const rpcSetting: RpcSetting = await getDbRecordRpcSettings(chainName);
  return rpcSetting[key];
}
export async function updateDbItemRpcSettings<T extends keyof RpcSetting>(
  chainName: ChainName,
  key: T,
  newValue: RpcSetting[T]
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
  userSettingsKey: UserSetting["userSettingsKey"]
): Promise<UserSetting> {
  return await dbSettings.transaction("r", tableNameUserSettings, async () => {
    const userSettings: UserSetting = await dbSettings
      .table(tableNameUserSettings)
      .get(userSettingsKey);

    return userSettings;
  });
}
export async function getDbItemUserSettings(
  userSettingsKey: UserSetting["userSettingsKey"]
): Promise<UserSetting["value"]> {
  return (await getDbRecordUserSettings(userSettingsKey)).value;
}

export async function updateDbItemUserSettings(
  userSettingsKey: UserSetting["userSettingsKey"],
  newValue: UserSetting["value"]
): Promise<void> {
  await dbSettings
    .transaction("rw", tableNameUserSettings, async () => {
      //update table
      await dbSettings
        .table(tableNameUserSettings)
        .update(userSettingsKey, { value: newValue });
    })
    .then(() => {
      //update store
      storeUserSettings.updateState(userSettingsKey, newValue);
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
    }
  );
}
