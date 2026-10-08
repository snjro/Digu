import type { ChainName } from "#constants/chains/types.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  storeSyncStoppedReason,
  type SyncStoppedReason,
} from "#stores/storeSyncStoppedReason.js";
import { get } from "svelte/store";

// Call before starting to abort, when the sync stops by itself. Keeps no
// reason when the chain is already stopping (the user stopped it).
export function recordSyncStoppedReason(
  chainName: ChainName,
  reason: SyncStoppedReason,
): void {
  if (get(storeSyncStatus)[chainName].isAbort) return;
  storeSyncStoppedReason.record(chainName, reason);
}
