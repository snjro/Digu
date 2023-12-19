import "fake-indexeddb/auto";
import { describe, expect, test, vi, type SpyInstance } from "vitest";
import { initialDataUserSettings, type UserSetting } from "./dbTypes";
import {
  getDbItemUserSettings,
  getDbRecordUserSettings,
  updateDbItemUserSettings,
} from "./dbSettings";
import { dbSettings } from "./dbSettings";
import { storeUserSettings } from "@stores/storeUserSettings";
import { DB_TABLE_NAMES } from "./constants";

const tableName = DB_TABLE_NAMES.Settings.userSettings;
const userSettingsId: UserSetting["userSettingsId"] = "userSetting01";
describe("getDbRecordUserSettings", () => {
  test("should return correct record", async () => {
    // set spy
    const spyTableGet = vi.spyOn(dbSettings.table(tableName), "get");
    // call target
    const result = await getDbRecordUserSettings(userSettingsId);
    // check
    expect(spyTableGet).toBeCalledWith(userSettingsId);
    expect(result).toEqual(initialDataUserSettings);
    // restore
    spyTableGet.mockRestore();
  });
  test(`should return "undefined" by setting invalid userSettingsId`, async () => {
    const invalidUserSettingsId: string = "foo";
    // set spy
    const spyTableGet = vi.spyOn(dbSettings.table(tableName), "get");
    // call target
    const result = await getDbRecordUserSettings(
      invalidUserSettingsId as UserSetting["userSettingsId"],
    );
    // check
    expect(spyTableGet).toBeCalledWith(invalidUserSettingsId);
    expect(result).toBeUndefined();
  });
});

describe("getDbItemUserSettings", () => {
  for (const key of Object.keys(initialDataUserSettings)) {
    test(`should return selected item "${key}"`, async () => {
      const targetKey: keyof UserSetting = key as keyof UserSetting;
      const result = await getDbItemUserSettings(userSettingsId, targetKey);
      expect(result).toBe(initialDataUserSettings[targetKey]);
    });
  }
  for (const key of Object.keys(initialDataUserSettings)) {
    const targetKey: keyof UserSetting = key as keyof UserSetting;

    test(`should return "undefined" when "userSettingsId" is invalid value. Selected item is ${key}`, async () => {
      // define invalid userSettingsId
      const invalidUserSettingsId: UserSetting["userSettingsId"] =
        "foo" as UserSetting["userSettingsId"];
      // call target
      const result = await getDbItemUserSettings(
        invalidUserSettingsId,
        targetKey,
      );
      // check
      expect(result).toBeUndefined();
    });
  }
  test(`should return "undefined" when the arg "key" is invalid value`, async () => {
    const invalidKey: keyof UserSetting = "foo" as keyof UserSetting;
    // call target
    const result = await getDbItemUserSettings(userSettingsId, invalidKey);
    // check
    expect(result).toBeUndefined();
  });
});

describe("updateDbItemRpcSettings", () => {
  const updatedUserSetting: UserSetting = {
    userSettingsId: userSettingsId,
    themeColor: "dark",
    devMode: true,
    selectedChainName: "matic",
    isOpenSidebar: false,
  };

  for (const key of Object.keys(updatedUserSetting)) {
    const targetKey: keyof UserSetting = key as keyof UserSetting;
    const newValue: UserSetting[keyof UserSetting] =
      updatedUserSetting[targetKey];
    test(`should update selected item "${targetKey}"`, async () => {
      // set spy
      const spyTableUpdate: SpyInstance = vi.spyOn(
        dbSettings.table(tableName),
        "update",
      );
      const spyStoreUserSettingsUpdateState = vi
        .spyOn(storeUserSettings, "updateState")
        .mockImplementation(() => {
          return vi.fn();
        });
      // call target
      await updateDbItemUserSettings(targetKey, newValue);
      //check
      expect(spyTableUpdate).toBeCalledWith("userSetting01", {
        [targetKey]: newValue,
      });
      expect(spyStoreUserSettingsUpdateState).toBeCalledWith({
        [targetKey]: newValue,
      });
      // restore
      spyTableUpdate.mockRestore();
      spyStoreUserSettingsUpdateState.mockRestore();
    });
  }
});
