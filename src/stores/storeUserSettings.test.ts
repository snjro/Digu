import { beforeEach, describe, expect, test, vi } from "vitest";
import type { StateUserSettings } from "./storeTypes";
import { get } from "svelte/store";
import type { UserSetting } from "@db/dbTypes";

const expectedInitialUserSettings: UserSetting = {
  userSettingsId: "userSetting01",
  themeColor: "light",
  devMode: false,
  selectedChainName: "eth",
  isOpenSidebar: true,
};

// Import a fresh store for each test, so that no test depends on the state
// left by another test.
async function importStoreUserSettings() {
  return (await import("./storeUserSettings")).storeUserSettings;
}

describe("storeUserSettings", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test(`should have the initial value`, async () => {
    const storeUserSettings = await importStoreUserSettings();
    const currenttStateUserSettings: StateUserSettings = get(storeUserSettings);
    expect(currenttStateUserSettings).toStrictEqual(
      expectedInitialUserSettings,
    );
  });
  test("should set with the value of the argument passed", async () => {
    const storeUserSettings = await importStoreUserSettings();
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
    expect(currenttStateUserSettings).toStrictEqual(userSetting);
  });
  test("should update state with the value passed", async () => {
    const storeUserSettings = await importStoreUserSettings();
    // set test data to the store by using `updateState`
    storeUserSettings.updateState({ themeColor: "dark", devMode: true });

    const currenttStateUserSettings: StateUserSettings = get(storeUserSettings);

    expect(currenttStateUserSettings).toStrictEqual({
      ...expectedInitialUserSettings,
      themeColor: "dark",
      devMode: true,
    });
  });
});
