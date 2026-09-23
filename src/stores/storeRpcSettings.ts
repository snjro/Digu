import type { StateRpcSettings } from "./storeTypes";
import type { ChainName } from "@constants/chains/types";
import { writable } from "svelte/store";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { initialDataRpcSetting, type RpcSetting } from "@db/dbTypes";

function store() {
  const { subscribe, set, update } = writable(getInitialState());
  const updateState = (
    chainName: ChainName,
    newRpcSetting: Partial<RpcSetting>,
  ): void => {
    update((state: StateRpcSettings) => ({
      ...state,
      [chainName]: { ...state[chainName], ...newRpcSetting },
    }));
  };
  return { subscribe, set, update, updateState };
}

export const storeRpcSettings = store();

function getInitialState(): StateRpcSettings {
  const initialState: StateRpcSettings = {};
  for (const targetChain of TARGET_CHAINS) {
    initialState[targetChain.name] = initialDataRpcSetting(targetChain);
  }
  return initialState;
}
