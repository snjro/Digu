import type { SyncStateText } from "#db/dbTypes.js";
import type { ChainActivity } from "#eventLogs/chainActivity.js";
import type { SyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { SYNC_STOPPED_TEXTS } from "../rpcInputHelperLabel";

export const SYNC_PANEL_ID = "sync-panel";

// The reason is shown only while the sync is stopped, and not while another
// tab syncs the chain. Also while this tab's sync still holds the lock after
// it stopped.
export function getShownSyncStoppedReason(
  activity: ChainActivity,
  syncStateText: SyncStateText,
  syncStoppedReason: SyncStoppedReason | undefined,
): SyncStoppedReason | undefined {
  switch (activity) {
    case "otherTab":
      return undefined;
    case "free":
    case "syncing":
    case "stopping":
    case "smallImport":
    case "largeImport":
    case "resetting":
      return syncStateText === "stopped" ? syncStoppedReason : undefined;
  }
}

export type SyncPanelStateText = { text: string; isError: boolean };

// The state of the sync in the panel. What to do about it is next to the
// control it blocks (Reset, Import).
export function getSyncPanelStateText(
  activity: ChainActivity,
  syncStateText: SyncStateText,
  syncStoppedReason: SyncStoppedReason | undefined,
): SyncPanelStateText | undefined {
  // This tab's syncStateText may be read from the DB while another tab syncs.
  if (activity === "otherTab") {
    return { text: "In use in another tab.", isError: false };
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
