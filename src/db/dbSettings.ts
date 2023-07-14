import type { Transaction } from "dexie";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type {
  RpcSetting,
  SchemaDefinition,
  UserSetting,
  UserSettingDevMode,
  UserSettingIsOpenSidebar,
  UserSettingSelectedChainName,
  UserSettingThemeColor,
} from "./dbTypes";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "./constants";
import { dbBase } from "./dbBase";
import {
  getDbRecordRpcSettings,
  getDbRecordUserSettings,
} from "./dbSettingsDataHandlers";
import type { Chain } from "@constants/chains/types";

export const TABLE_SETTINGS_COLUMN_NAMES = {
  RpcSettings: {
    chainName: "chainName",
    rpc: "rpc",
    bulkUnit: "bulkUnit",
    blokIntervalMs: "blokIntervalMs",
  },
  userSettings: {
    userSettingsKey: "userSettingsKey",
    value: "value",
  },
} as const;

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
      [DB_TABLE_NAMES.Settings.rpcSettings]:
        TABLE_SETTINGS_COLUMN_NAMES.RpcSettings.chainName,
      [DB_TABLE_NAMES.Settings.userSettings]:
        TABLE_SETTINGS_COLUMN_NAMES.userSettings.userSettingsKey,
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
export const initialDataRpcSetting = (targetChain: Chain): RpcSetting => {
  return {
    chainName: targetChain.name,
    // rpc: targetChain.rpc[0], //TODO: TBD
    rpc: "",
    bulkUnit: 1000, //TODO: TBD
    chainExplorerIndex: 0, //TODO: TBD
    blockIntervalMs: targetChain.blockIntervalMs,
    tryCount: targetChain.tryCount,
    abortWatchIntervalMs: targetChain.abortWatchIntervalMs,
  };
};
async function addInitialDataUserSettings(tx: Transaction) {
  const adds: UserSetting[] = [];
  for (const userSetting of initialDataUserSettings()) {
    if (
      (await getDbRecordUserSettings(userSetting.userSettingsKey)) === undefined
    ) {
      adds.push(userSetting);
    }
  }
  if (adds.length > 0) {
    await tx.table(DB_TABLE_NAMES.Settings.userSettings).bulkAdd(adds);
  }
}
export const dbSettings: DbSettings = new DbSettings();
export const initialDataUserSettings = (): UserSetting[] => {
  const userSettingThemeColor: UserSettingThemeColor = {
    userSettingsKey: "themeColor",
    value: "light",
  };
  const userSettingDevMode: UserSettingDevMode = {
    userSettingsKey: "devMode",
    value: false,
  };
  const userSettingSelectedChainName: UserSettingSelectedChainName = {
    userSettingsKey: "selectedChainName",
    value: "eth",
  };
  const userSettingIsOpenSidebar: UserSettingIsOpenSidebar = {
    userSettingsKey: "isOpenSidebar",
    value: true,
  };
  return [
    userSettingThemeColor,
    userSettingDevMode,
    userSettingSelectedChainName,
    userSettingIsOpenSidebar,
  ];
};

// export const initialDataUserSettings = () => {
//   return [
//     {
//       userSettingsKey: "themeColor",
//       value: "light",
//     },
//     {
//       userSettingsKey: "notifications",
//       value: { screen1: true, screen2: true },
//     },
//   ];
// };
