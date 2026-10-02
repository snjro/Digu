import type { ChainStatus } from "#db/dbTypes.js";
import type { StateChainStatuses } from "./storeTypes";
import type { ChainName } from "#constants/chains/types.js";
import { initialDataChainStatus } from "#db/dbChainStatus.js";
import { writable } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
function store() {
  const { subscribe, set, update } = writable(getInitialState());
  const updateState = (
    chainName: ChainName,
    newChainStatus: Partial<ChainStatus>,
  ): void => {
    update((state: StateChainStatuses) => ({
      ...state,
      [chainName]: { ...state[chainName], ...newChainStatus },
    }));
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
