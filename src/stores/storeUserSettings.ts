import { writable } from "svelte/store";
import type { StateUserSettings } from "./storeTypes";
import type { UserSetting } from "@db/dbTypes";
// import { initialDataUserSettings } from "@db/dbSettings";

function store() {
  const state: StateUserSettings = getInitialState();
  const { subscribe, set, update } = writable(state);
  const updateState = (
    userSettingsKey: UserSetting["userSettingsKey"],
    newValue: UserSetting["value"]
  ): void => {
    state[userSettingsKey] = newValue;
    set(state);
  };

  return { subscribe, set, update, updateState };
}

export const storeUserSettings = store();

function getInitialState(): StateUserSettings {
  // TODO: return by using "initialDataUserSettings"
  // console.log(2020220, initialDataUserSettings);
  // return Object.assign(
  //   {},
  //   ...initialDataUserSettings().map((initialData: UserSetting) => {
  //     return { [initialData.userSettingsKey]: initialData };
  //   })
  // );
  return {
    themeColor: "light",
    devMode: false,
    selectedChainName: "eth",
    isOpenSidebar: true,
  };
}
