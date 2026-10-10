import type { ChainStatus } from "#db/dbTypes.js";
import type { StateChainStatuses } from "./storeTypes";
import type { ChainName } from "#constants/chains/types.js";
import { initialDataChainStatus } from "#db/dbChainStatus.js";
import { get, writable } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
function store() {
  const chainStatuses = writable(getInitialState());
  const { subscribe, set, update } = chainStatuses;
  const updateState = (
    chainName: ChainName,
    newChainStatus: Partial<ChainStatus>,
  ): void => {
    update((state: StateChainStatuses) => ({
      ...state,
      [chainName]: { ...state[chainName], ...newChainStatus },
    }));
  };
  // Only a higher block, so that a writer that read the DB before another
  // writer raised it does not move the latest block back. A lower or the same
  // block does not notify the subscribers.
  const raiseLatestBlockNumber = (
    chainName: ChainName,
    latestBlockNumber: number,
  ): void => {
    if (latestBlockNumber > get(chainStatuses)[chainName].latestBlockNumber) {
      updateState(chainName, { latestBlockNumber });
    }
  };
  return { subscribe, set, update, updateState, raiseLatestBlockNumber };
}
export const storeChainStatus = store();

function getInitialState(): StateChainStatuses {
  const initialState: StateChainStatuses = {};
  for (const targetChain of TARGET_CHAINS) {
    initialState[targetChain.name] = initialDataChainStatus(targetChain.name);
  }
  return initialState;
}
