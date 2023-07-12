import type { ChainStatus } from "@db/dbTypes";
import type { StateChainStatuses } from "./storeTypes";
import type { ChainName } from "@constants/chains/types";
import { initialDataChainStatus } from "@db/dbChainStatus";
import { writable } from "svelte/store";
import { TARGET_CHAINS } from "@constants/chains/_index";
function store() {
  const state: StateChainStatuses = getInitialState();
  const { subscribe, set, update } = writable(state);
  const updateState = (
    chainName: ChainName,
    newChainStatus: Partial<ChainStatus>
  ): void => {
    Object.assign(state[chainName], newChainStatus);
    set(state);
  };
  return { subscribe, set, update, updateState };
}
export const storeChainStatus = store();

function getInitialState(): StateChainStatuses {
  const initialState: StateChainStatuses = {};
  for (const targetChain of TARGET_CHAINS) {
    initialState[targetChain.name] = initialDataChainStatus(targetChain.name);
  }
  return initialState;
}
