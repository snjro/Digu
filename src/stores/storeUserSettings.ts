import { writable } from "svelte/store";
import type { StateUserSettings } from "./storeTypes";
import { initialDataUserSettings, type UserSetting } from "@db/dbTypes";

function store() {
  const state: StateUserSettings = getInitialState();
  const { subscribe, set, update } = writable(state);
  const updateState = (newUserSetting: Partial<UserSetting>): void => {
    Object.assign(state, newUserSetting);
    set(state);
  };

  return { subscribe, set, update, updateState };
}

export const storeUserSettings = store();

function getInitialState(): StateUserSettings {
  return initialDataUserSettings();
}
