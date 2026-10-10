import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, test } from "vitest";
import { DB_TABLE_NAMES } from "#db/constants.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain } from "#constants/chains/types.js";
import { dbSettings } from "./dbSettings";
import {
  initialDataRpcSetting,
  initialDataUserSettings,
  type RpcSetting,
  type SchemaDefinition,
} from "./dbTypes";

const tableNameRpcSettings = DB_TABLE_NAMES.Settings.rpcSettings;
const tableNameUserSettings = DB_TABLE_NAMES.Settings.userSettings;

describe("the upgrade to version 2", () => {
  test("should delete the removed items from the RPC settings and keep the others", async () => {
    const targetChain: Chain = TARGET_CHAINS[0];
    const rpcSetting: RpcSetting = {
      ...initialDataRpcSetting(targetChain),
      rpc: "https://saved.example",
      inputType: "password",
      warpSync: false,
    };
    await Dexie.delete(dbSettings.name);

    // create the database of version 1, which had the items
    const oldDb = new Dexie(dbSettings.name);
    const oldSchema: SchemaDefinition = {
      [tableNameRpcSettings]: "chainName",
      [tableNameUserSettings]: "userSettingsId",
    };
    oldDb.version(1).stores(oldSchema);
    await oldDb.table(tableNameRpcSettings).add({
      ...rpcSetting,
      bulkUnit: 1000,
      chainExplorerIndex: 1,
      blockIntervalMs: 3000,
      tryCount: 5,
      abortWatchIntervalMs: 5000,
    });
    await oldDb.table(tableNameUserSettings).add(initialDataUserSettings);
    oldDb.close();

    // call target
    await dbSettings.open();

    expect(
      await dbSettings.table(tableNameRpcSettings).get(targetChain.name),
    ).toStrictEqual(rpcSetting);
    expect(
      await dbSettings
        .table(tableNameUserSettings)
        .get(initialDataUserSettings.userSettingsId),
    ).toStrictEqual(initialDataUserSettings);
    dbSettings.close();
    await Dexie.delete(dbSettings.name);
  });

  test("should keep the rows of v1.1.2, which have no warpSync, without warpSync", async () => {
    const targetChain: Chain = TARGET_CHAINS[0];
    await Dexie.delete(dbSettings.name);

    // the database of version 1 of v1.1.2
    const oldDb = new Dexie(dbSettings.name);
    const oldSchema: SchemaDefinition = {
      [tableNameRpcSettings]: "chainName",
      [tableNameUserSettings]: "userSettingsId",
    };
    oldDb.version(1).stores(oldSchema);
    await oldDb.table(tableNameRpcSettings).add({
      chainName: targetChain.name,
      rpc: "https://saved.example",
      bulkUnit: 100,
      chainExplorerIndex: 0,
      blockIntervalMs: 20000,
      tryCount: 10,
      inputType: "password",
    });
    await oldDb.table(tableNameUserSettings).add(initialDataUserSettings);
    oldDb.close();

    // call target
    await dbSettings.open();

    expect(
      await dbSettings.table(tableNameRpcSettings).get(targetChain.name),
    ).toStrictEqual({
      chainName: targetChain.name,
      rpc: "https://saved.example",
      inputType: "password",
    });
    dbSettings.close();
    await Dexie.delete(dbSettings.name);
  });
});
