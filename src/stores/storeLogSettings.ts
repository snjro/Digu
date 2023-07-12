import type { StateLogSettings } from "./storeTypes";
import type { ChainName } from "@constants/chains/types";
import type { LogSetting } from "@db/dbTypes";
import { writable } from "svelte/store";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { initialDataLogSetting } from "@db/dbSettings";

function store() {
  const state: StateLogSettings = getInitialState();
  const { subscribe, set, update } = writable(state);
  const updateState = (
    chainName: ChainName,
    newLogSetting: Partial<LogSetting>
  ): void => {
    Object.assign(state[chainName], newLogSetting);
    // update((newState) => newState)
    set(state);
  };
  return { subscribe, set, update, updateState };
}

export const storeLogSettings = store();

function getInitialState(): StateLogSettings {
  const initialState: StateLogSettings = {};
  for (const targetChain of TARGET_CHAINS) {
    initialState[targetChain.name] = initialDataLogSetting(targetChain);
  }
  return initialState;
}
