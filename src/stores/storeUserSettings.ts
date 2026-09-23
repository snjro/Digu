import { writable } from "svelte/store";
import type { StateUserSettings } from "./storeTypes";
import { initialDataUserSettings, type UserSetting } from "@db/dbTypes";

function store() {
  const { subscribe, set, update } = writable(getInitialState());
  const updateState = (newUserSetting: Partial<UserSetting>): void => {
    update((state: StateUserSettings) => ({ ...state, ...newUserSetting }));
  };

  return { subscribe, set, update, updateState };
}

export const storeUserSettings = store();

function getInitialState(): StateUserSettings {
  // Copy it so that the store does not change the shared initial data.
  return { ...initialDataUserSettings };
}
