import type { ChainName } from "#constants/chains/types.js";
import type { SyncStateText } from "#db/dbTypes.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  isWarpSyncRunning,
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
  // Another tab's operation, or this tab reading the chain again after it.
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
      return getImportActivity(sources.warpSyncState);
    case "sync":
      // The import before the sync, in the lock of the sync.
      if (isWarpSyncRunning(sources.warpSyncState)) {
        return getImportActivity(sources.warpSyncState);
      }
      // Also while it starts or ends, when syncStateText is "stopped".
      return sources.syncStateText === "stopping" ? "stopping" : "syncing";
  }
}

// Only a large import shows its progress and can be stopped.
function getImportActivity(state: WarpSyncState): ChainActivity {
  return state.status === "importing" && state.progress !== undefined
    ? "largeImport"
    : "smallImport";
}

// storeSyncStatus has every chain.
export const storeChainActivity: Readable<Record<ChainName, ChainActivity>> =
  createStoreChainActivity();

// Set only when an activity changes: storeSyncStatus changes with each range
// that a sync saves.
function createStoreChainActivity(): Readable<
  Record<ChainName, ChainActivity>
> {
  let shown: Record<ChainName, ChainActivity> = {};
  return derived(
    [
      storeSyncLockedByThisTab,
      storeSyncLockedByOtherTab,
      storeSyncStatus,
      storeWarpSync,
    ],
    ([lockedByThisTab, lockedByOtherTab, syncStatus, warpSync], set) => {
      const activities: Record<ChainName, ChainActivity> = Object.fromEntries(
        Object.keys(syncStatus).map((chainName: ChainName) => [
          chainName,
          getChainActivity({
            lockedByThisTab: lockedByThisTab[chainName],
            lockedByOtherTab: lockedByOtherTab[chainName] ?? false,
            syncStateText: syncStatus[chainName].syncStateText,
            warpSyncState: selectWarpSyncState(warpSync, chainName),
          }),
        ]),
      );
      if (isSameActivities(shown, activities)) return;
      shown = activities;
      set(activities);
    },
    shown,
  );
}

function isSameActivities(
  a: Record<ChainName, ChainActivity>,
  b: Record<ChainName, ChainActivity>,
): boolean {
  const chainNames: ChainName[] = Object.keys(a);
  return (
    chainNames.length === Object.keys(b).length &&
    chainNames.every((chainName: ChainName) => a[chainName] === b[chainName])
  );
}
