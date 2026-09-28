import type { ChainName } from "@constants/chains/types";
import { writable, type Writable } from "svelte/store";

// Without ethers, so that the components can import it.

// The chains that have a snapshot under static/warp-sync.
export const WARP_SYNC_CHAIN_NAMES: readonly ChainName[] = ["matic", "eth"];

// What is left to import (see getWarpSyncPending of warpSyncImport.ts).
export type WarpSyncPending = {
  logCount: number;
  // The logs of the contracts of the app in the whole snapshot: fewer are
  // left when some were imported (or synced) before.
  snapshotLogCount: number;
  // Of the gzip files, and of their JSON.
  bytes: number;
  rawBytes: number;
  files: number;
};
// Above either of them, the user confirms before the import.
export const CONFIRM_ABOVE_LOGS = 10_000;
export const CONFIRM_ABOVE_BYTES = 10_000_000;
export function needsConfirmation(pending: WarpSyncPending): boolean {
  return (
    pending.logCount > CONFIRM_ABOVE_LOGS || pending.bytes > CONFIRM_ABOVE_BYTES
  );
}

export type WarpSyncState = {
  // "none": the chain has no snapshot, or none of its contracts is in the app.
  // "unsupported": the browser cannot decompress the files.
  // "confirm": the import waits for the user (pending is set). "declined":
  // "Not now" in this tab. "stopped": stopped by the user in this tab.
  status:
    | "idle"
    | "confirm"
    | "declined"
    | "importing"
    | "imported"
    | "stopped"
    | "failed"
    | "none"
    | "unsupported";
  // The last block of the snapshot and when it was made, once it is read.
  toBlock?: number;
  createdAt?: string;
  pending?: WarpSyncPending;
  // "Import" could not start: the chain was synced (the lock was held).
  busy?: boolean;
  // While importing: the logs of the ranges done, of pending.logCount.
  progress?: { doneLogCount: number; startedAt: number };
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

// The import of each chain in this tab, to stop it from the nav.
const stopControllers: Map<ChainName, AbortController> = new Map();
export function setWarpSyncStopController(
  chainName: ChainName,
  controller: AbortController | undefined,
): void {
  if (controller) stopControllers.set(chainName, controller);
  else stopControllers.delete(chainName);
}
// Stops the import of this tab before its next file; the file being
// imported is not saved.
export function stopWarpSync(chainName: ChainName): void {
  stopControllers.get(chainName)?.abort(new Error("Stopped by the user."));
}
