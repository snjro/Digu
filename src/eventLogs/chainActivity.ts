import type { ChainName } from "#constants/chains/types.js";
import type { SyncStateText } from "#db/dbTypes.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  selectWarpSyncState,
  storeWarpSync,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
import { derived, type Readable } from "svelte/store";
import {
  storeSyncLockedByOtherTab,
  storeSyncLockedByThisTab,
  type SyncLockKind,
} from "./syncLock";

// What goes on with a chain. It is busy unless "free", and only the sync
// lock tells that: syncStateText and the warp sync state give the detail.
export type ChainActivity =
  | "free"
  | "syncing"
  | "stopping"
  | "otherTab"
  | "smallImport"
  | "largeImport"
  | "resetting";

export type ChainActivitySources = {
  lockedByThisTab: SyncLockKind | undefined;
  lockedByOtherTab: boolean;
  syncStateText: SyncStateText;
  warpSyncState: WarpSyncState;
};

export function getChainActivity(sources: ChainActivitySources): ChainActivity {
  // Before this tab's own operation: this tab may only wait for the lock.
  if (sources.lockedByOtherTab) return "otherTab";
  switch (sources.lockedByThisTab) {
    case undefined:
      return "free";
    case "reset":
      return "resetting";
    case "import":
      // Only a large import shows its progress and can be stopped.
      return sources.warpSyncState.status === "importing" &&
        sources.warpSyncState.progress !== undefined
        ? "largeImport"
        : "smallImport";
    case "sync":
      // Also while it starts or ends, when syncStateText is "stopped". An
      // import before the sync is a part of it.
      return sources.syncStateText === "stopping" ? "stopping" : "syncing";
  }
}

// storeSyncStatus has every chain.
export const storeChainActivity: Readable<Record<ChainName, ChainActivity>> =
  derived(
    [
      storeSyncLockedByThisTab,
      storeSyncLockedByOtherTab,
      storeSyncStatus,
      storeWarpSync,
    ],
    ([lockedByThisTab, lockedByOtherTab, syncStatus, warpSync]) =>
      Object.fromEntries(
        Object.keys(syncStatus).map((chainName: ChainName) => [
          chainName,
          getChainActivity({
            lockedByThisTab: lockedByThisTab[chainName],
            lockedByOtherTab: lockedByOtherTab[chainName] ?? false,
            syncStateText: syncStatus[chainName].syncStateText,
            warpSyncState: selectWarpSyncState(warpSync, chainName),
          }),
        ]),
      ),
  );
