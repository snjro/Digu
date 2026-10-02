import type { SyncStateText } from "#db/dbTypes.js";
import type { SyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { SYNC_STOPPED_TEXTS } from "../rpcInputHelperLabel";

export const SYNC_PANEL_ID = "sync-panel";

// The reason is shown only while the sync is stopped, and not while another
// tab syncs the chain.
export function getShownSyncStoppedReason(
  syncStateText: SyncStateText,
  isSyncingInOtherTab: boolean,
  syncStoppedReason: SyncStoppedReason | undefined,
): SyncStoppedReason | undefined {
  return syncStateText === "stopped" && !isSyncingInOtherTab
    ? syncStoppedReason
    : undefined;
}

export type SyncPanelStateText = { text: string; isError: boolean };

// The state of the sync in the panel. What to do about it is next to the
// control it blocks (Reset, Import).
export function getSyncPanelStateText(
  syncStateText: SyncStateText,
  isSyncingInOtherTab: boolean,
  syncStoppedReason: SyncStoppedReason | undefined,
): SyncPanelStateText | undefined {
  if (isSyncingInOtherTab) {
    return { text: "Syncing in another tab.", isError: false };
  }
  switch (syncStateText) {
    case "syncing":
      return { text: "Syncing.", isError: false };
    case "stopping":
      return { text: "Stopping.", isError: false };
    case "stopped":
      return syncStoppedReason
        ? { text: SYNC_STOPPED_TEXTS[syncStoppedReason], isError: true }
        : { text: "Stopped.", isError: false };
    default:
      return undefined;
  }
}
