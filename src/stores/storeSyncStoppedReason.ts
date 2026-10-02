import type { ChainName } from "#constants/chains/types.js";
import { writable } from "svelte/store";

export type SyncStoppedReason = "RPC_ERRORS" | "UNEXPECTED_ERROR";
export type StateSyncStoppedReasons = {
  [key in ChainName]?: SyncStoppedReason;
};

// Why the sync of a chain stopped by itself. Only in memory: reloading the
// page clears it.
function store() {
  const { subscribe, set, update } = writable<StateSyncStoppedReasons>({});
  // Keeps the first reason.
  const record = (chainName: ChainName, reason: SyncStoppedReason): void => {
    update((state: StateSyncStoppedReasons) =>
      state[chainName] ? state : { ...state, [chainName]: reason },
    );
  };
  const clear = (chainName: ChainName): void => {
    update((state: StateSyncStoppedReasons) =>
      state[chainName] ? { ...state, [chainName]: undefined } : state,
    );
  };
  return { subscribe, set, record, clear };
}
export const storeSyncStoppedReason = store();
