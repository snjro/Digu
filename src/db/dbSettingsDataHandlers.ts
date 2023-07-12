import type { ChainName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { dbSettings } from "./dbSettings";
import type { LogSetting, UserSetting } from "./dbTypes";
import { storeLogSettings } from "@stores/storeLogSettings";
import { storeUserSettings } from "@stores/storeUserSettings";

const tableNameLogSettings = DB_TABLE_NAMES.Settings.logSettings;
const tableNameUserSettings = DB_TABLE_NAMES.Settings.userSettings;

export async function getDbRecordLogSettings(
  chainName: ChainName
): Promise<LogSetting> {
  return await dbSettings.transaction("r", tableNameLogSettings, async () => {
    const logSetting: LogSetting = await dbSettings
      .table(tableNameLogSettings)
      .get(chainName);

    return logSetting;
  });
}
export async function getDbItemLogSettings<T extends keyof LogSetting>(
  chainName: ChainName,
  key: T
): Promise<LogSetting[T]> {
  const logSetting: LogSetting = await getDbRecordLogSettings(chainName);
  return logSetting[key];
}
export async function updateDbItemLogSettings<T extends keyof LogSetting>(
  chainName: ChainName,
  key: T,
  newValue: LogSetting[T]
): Promise<void> {
  await dbSettings
    .transaction("rw", tableNameLogSettings, async () => {
      //update table
      await dbSettings
        .table(tableNameLogSettings)
        .update(chainName, { [key]: newValue });
    })
    .then(() => {
      //update store
      storeLogSettings.updateState(chainName, { [key]: newValue });
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
    dbSettings.table(tableNameLogSettings),
    dbSettings.table(tableNameUserSettings),
    async (tx) => {
      await dbSettings.addInitialData(tx);
    }
  );
}
