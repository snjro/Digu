import "fake-indexeddb/auto";
import { describe, expect, test, vi, type SpyInstance } from "vitest";
import { initialDataRpcSetting, type RpcSetting } from "./dbTypes";
import { dbSettings } from "./dbSettings";
import {
  getDbItemRpcSettings,
  getDbRecordRpcSettings,
  updateDbItemRpcSettings,
} from "./dbSettings";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { DB_TABLE_NAMES } from "./constants";
import { TARGET_CHAINS } from "@constants/chains/_index";
import * as DBS from "./dbSettings";

const tableName = DB_TABLE_NAMES.Settings.rpcSettings;
const dummyChainName = "chainName";
describe("getDbRecordRpcSettings", () => {
  test("should return correct record", async () => {
    // set spy
    const spyTableGet = vi.spyOn(dbSettings.table(tableName), "get");

    for (const targetChain of TARGET_CHAINS) {
      // call target
      const rpcSetting: RpcSetting | undefined = await getDbRecordRpcSettings(
        targetChain.name,
      );
      // check
      expect(spyTableGet).toBeCalledWith(targetChain.name);
      expect(rpcSetting).toEqual(initialDataRpcSetting(targetChain));
    }
    // restore
    spyTableGet.mockRestore();
  });
  test(`should return "undefined" by setting invalid chainName`, async () => {
    const invalidChainName: string = "foo";
    // set spy
    const spyTableGet = vi.spyOn(dbSettings.table(tableName), "get");

    // call target
    const rpcSetting: RpcSetting | undefined =
      await getDbRecordRpcSettings(invalidChainName);
    // check
    expect(spyTableGet).toBeCalledWith(invalidChainName);
    expect(rpcSetting).toBeUndefined();

    // restore
    spyTableGet.mockRestore();
  });
});

describe("getDbItemRpcSettings", async () => {
  for (const targetChain of TARGET_CHAINS) {
    const initialRpcSetting: RpcSetting =
      await initialDataRpcSetting(targetChain);
    for (const key of Object.keys(initialRpcSetting)) {
      const targetKey: keyof RpcSetting = key as keyof RpcSetting;

      test(`should return item "${key}"`, async () => {
        // call target
        const result = await getDbItemRpcSettings(targetChain.name, targetKey);
        // check
        expect(result).toBe(initialRpcSetting[targetKey]);
      });
    }
  }

  test(`should return "undefined" when chainName is invalid value`, async () => {
    // set spy
    const spyGetDbRecordRpcSettings = vi.spyOn(DBS, "getDbRecordRpcSettings");

    // call target
    const result = await getDbItemRpcSettings(
      dummyChainName,
      "rpc" as keyof RpcSetting,
    );
    // check
    expect(spyGetDbRecordRpcSettings).toBeCalledWith(dummyChainName);
    expect(result).toBeUndefined();

    // restore
    spyGetDbRecordRpcSettings.mockRestore();
  });

  test(`should return "undefined" when the arg "key" is invalid value`, async () => {
    const invalidKey: string = "foo";
    // set spy
    const spyGetDbRecordRpcSettings = vi.spyOn(DBS, "getDbRecordRpcSettings");

    // call target
    const result = await getDbItemRpcSettings(
      TARGET_CHAINS[0].name,
      invalidKey as keyof RpcSetting,
    );
    // check
    expect(spyGetDbRecordRpcSettings).toBeCalledWith(TARGET_CHAINS[0].name);
    expect(result).toBeUndefined();

    // restore
    spyGetDbRecordRpcSettings.mockRestore();
  });
});
describe("updateDbItemRpcSettings", () => {
  const updatedRpcSetting: RpcSetting = {
    chainName: dummyChainName,
    rpc: "dummyRpcUpdated",
    bulkUnit: 10,
    chainExplorerIndex: 20,
    blockIntervalMs: 30,
    tryCount: 40,
    abortWatchIntervalMs: 50,
    inputType: "password",
  };

  for (const key of Object.keys(updatedRpcSetting)) {
    const targetKey: keyof RpcSetting = key as keyof RpcSetting;
    const newValue: RpcSetting[keyof RpcSetting] = updatedRpcSetting[targetKey];
    test(`should update selected item "${targetKey}"`, async () => {
      // set spy
      const spyTableUpdate: SpyInstance = vi.spyOn(
        dbSettings.table(tableName),
        "update",
      );
      const spyStoreRpcSettingsUpdateState = vi
        .spyOn(storeRpcSettings, "updateState")
        .mockImplementation(() => {
          return vi.fn();
        });

      // call target
      await updateDbItemRpcSettings(dummyChainName, targetKey, newValue);

      //check
      expect(spyTableUpdate).toBeCalledWith(dummyChainName, {
        [targetKey]: newValue,
      });
      expect(spyStoreRpcSettingsUpdateState).toBeCalledWith(dummyChainName, {
        [targetKey]: newValue,
      });

      // restore
      spyTableUpdate.mockRestore();
      spyStoreRpcSettingsUpdateState.mockRestore();
    });
  }
});
