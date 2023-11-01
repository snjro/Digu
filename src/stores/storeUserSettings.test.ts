import { describe, expect, test } from "vitest";
import { storeUserSettings } from "./storeUserSettings";
import type { StateUserSettings } from "./storeTypes";
import { get } from "svelte/store";
import { initialDataUserSettings, type UserSetting } from "@db/dbTypes";

describe("storeUserSettings", () => {
  test(`should have the initial value`, () => {
    const currenttStateUserSettings: StateUserSettings = get(storeUserSettings);
    expect(currenttStateUserSettings).toEqual(initialDataUserSettings());
  });
  test("should set with the value of the argument passed", () => {
    const userSetting: UserSetting = {
      userSettingsId: "userSetting01",
      themeColor: "dark",
      devMode: true,
      selectedChainName: "matic",
      isOpenSidebar: false,
    };
    // set test data to the store by using `set`
    storeUserSettings.set(userSetting);
    const currenttStateUserSettings: StateUserSettings = get(storeUserSettings);
    expect(currenttStateUserSettings).toEqual(userSetting);
  });
  test("should update state with the value passed", () => {
    const userSetting: UserSetting = {
      userSettingsId: "userSetting01",
      themeColor: "dark",
      devMode: true,
      selectedChainName: "matic",
      isOpenSidebar: false,
    };
    // set test data to the store by using `updateState`
    storeUserSettings.updateState(userSetting);

    const currenttStateUserSettings: StateUserSettings = get(storeUserSettings);

    expect(currenttStateUserSettings).toEqual(userSetting);
  });
});
