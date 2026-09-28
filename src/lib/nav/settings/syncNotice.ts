import type { SyncStateText } from "@db/dbTypes";

// Why some settings cannot be changed now, or undefined when they can.
export function getSyncNoticeText(
  syncStateText: SyncStateText,
): string | undefined {
  switch (syncStateText) {
    case "syncing":
      return "Syncing. Stop the sync to change these settings.";
    case "stopping":
      return "Stopping the sync… The settings can be changed once it stops.";
    default:
      return undefined;
  }
}
