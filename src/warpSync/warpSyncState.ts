import type { ChainName } from "@constants/chains/types";
import { writable, type Writable } from "svelte/store";

// Without ethers, so that the components can import it.

// The chains that have a snapshot under static/warp-sync.
export const WARP_SYNC_CHAIN_NAMES: readonly ChainName[] = ["matic"];

export type WarpSyncState = {
  // "none": the chain has no snapshot, or none of its contracts is in the app.
  status: "idle" | "importing" | "imported" | "failed" | "none";
  // The last block of the snapshot and when it was made, once it is read.
  toBlock?: number;
  createdAt?: string;
};
// A chain that is not in it is "idle".
export const storeWarpSync: Writable<Record<ChainName, WarpSyncState>> =
  writable({});
export function selectWarpSyncState(
  states: Record<ChainName, WarpSyncState>,
  chainName: ChainName,
): WarpSyncState {
  return states[chainName] ?? { status: "idle" };
}
export function setWarpSyncState(
  chainName: ChainName,
  state: WarpSyncState,
): void {
  storeWarpSync.update((states) => ({ ...states, [chainName]: state }));
}

export function hasWarpSync(chainName: ChainName): boolean {
  return WARP_SYNC_CHAIN_NAMES.includes(chainName);
}
