import type { BaseSnackbarProps } from "#lib/base/snackbarProps.js";
import type { SyncStateText, SyncStatusChain } from "#db/dbTypes.js";
import type {
  SyncResetOutcome,
  SyncResetResult,
} from "#eventLogs/syncReset.js";
import { numberWithCommas } from "#utils/utilsCommon.js";
import type { WarpSyncState } from "#warpSync/warpSyncState.js";

// The logs of every event of the chain, as the sync counts them.
export function countSyncedLogs(syncStatusChain: SyncStatusChain): number {
  let count: number = 0;
  for (const project of Object.values(syncStatusChain.subSyncStatuses)) {
    for (const version of Object.values(project.subSyncStatuses)) {
      for (const contract of Object.values(version.subSyncStatuses)) {
        for (const event of Object.values(contract?.events ?? {})) {
          count += event?.recordCount ?? 0;
        }
      }
    }
  }
  return count;
}

// What to do when the sync blocks an action (Reset, Import).
export const STOP_THE_SYNC_FIRST = "Stop the sync first.";

// Shown with a pulse: something goes on, unlike STOP_THE_SYNC_FIRST, which
// waits for the user.
export const WAIT_UNTIL_THE_SYNC_STOPS = "Wait until the sync stops.";

export type ResetConditions = {
  syncStateText: SyncStateText;
  isSyncingInOtherTab: boolean;
  isImporting: boolean;
  isResetting: boolean;
};

// Why the reset cannot run now, or undefined when it can.
export function getResetDisabledReason(
  conditions: ResetConditions,
): string | undefined {
  if (conditions.isResetting) return "Resetting…";
  // The panel says that the chain is synced in another tab.
  if (conditions.isSyncingInOtherTab) {
    return "Stop the sync in the other tab first.";
  }
  if (conditions.syncStateText === "syncing") return STOP_THE_SYNC_FIRST;
  // "stop sync" was pressed: the contracts end what they are doing first.
  if (conditions.syncStateText === "stopping") return WAIT_UNTIL_THE_SYNC_STOPS;
  // The nav has "Stop" for a large import.
  if (conditions.isImporting) {
    return "Wait until the logs published with this site are imported, or stop the import.";
  }
  return undefined;
}

export function getResetConfirmationTexts(
  chainFullName: string,
  logCount: string,
  isWarpSyncOn: boolean,
): string[] {
  return [
    `This deletes the ${logCount} event logs of ${chainFullName} and their block times saved in this browser, and the sync of every contract starts again from its creation block.`,
    "Your settings are kept: the RPC, the warp sync and the contracts to sync.",
    isWarpSyncOn
      ? "The logs published with this site are imported again first; when they are many, you are asked first. Turn off the warp sync to fetch every log from your RPC."
      : NEXT_SYNC_FETCHES_ALL,
  ];
}

const NEXT_SYNC_FETCHES_ALL =
  "The next sync fetches every log again from your RPC.";

// A line of the result, shown in the confirmation dialog after the reset.
export type ResetResultLine = { text: string; isError: boolean };

// In the dialog, or in the snackbar when the dialog was closed first.
const RESET_BUSY = `The chain is synced now, so nothing was deleted. ${STOP_THE_SYNC_FIRST}`;
const RESET_FAILED = "Reset failed. Some logs may be left. Try again.";

// The lines right after the reset, before the import of the warp sync ends.
export function getResetResultLines(
  outcome: SyncResetOutcome,
  chainFullName: string,
): ResetResultLine[] {
  switch (outcome.result) {
    case "busy":
      return [{ text: RESET_BUSY, isError: true }];
    case "failed":
      return [{ text: RESET_FAILED, isError: true }];
    case "reset":
      return [
        {
          text: `Deleted ${numberWithCommas(outcome.deletedLogCount)} event logs of ${chainFullName}.`,
          isError: false,
        },
        {
          text: outcome.warpSyncImport
            ? "Importing the logs published with this site…"
            : NEXT_SYNC_FETCHES_ALL,
          isError: false,
        },
      ];
  }
}

// The line that replaces "Importing…" once the import has ended.
export function getImportResultLine(
  state: WarpSyncState,
  logCount: string,
): ResetResultLine {
  switch (state.status) {
    case "imported":
      return {
        text: `Imported ${logCount} logs up to block ${numberWithCommas(state.toBlock ?? 0)}.`,
        isError: false,
      };
    case "failed":
      return {
        text: "Could not import the logs published with this site. The next sync tries again, or fetches them from your RPC.",
        isError: true,
      };
    case "none":
      return {
        text: `This site has no event logs of this chain to import. ${NEXT_SYNC_FETCHES_ALL}`,
        isError: false,
      };
    case "confirm":
      return {
        text: "Many logs are published with this site: they are imported after you confirm.",
        isError: false,
      };
    case "declined":
    case "stopped":
      return {
        text: "The logs published with this site were not imported. Import them from the warp sync setting.",
        isError: false,
      };
    default:
      // Skipped: another tab took the lock first.
      return {
        text: "The logs published with this site are imported the next time the chain is opened or synced.",
        isError: false,
      };
  }
}

// Only the failures of a reset whose dialog was closed first: the dialog shows
// the result.
export function getResetSnackBar(
  result: SyncResetResult,
): BaseSnackbarProps | undefined {
  switch (result) {
    case "reset":
      return undefined;
    case "busy":
      return {
        visible: true,
        iconProps: { name: "close", colorCategory: "error" },
        text: RESET_BUSY,
      };
    case "failed":
      return {
        visible: true,
        iconProps: { name: "close", colorCategory: "error" },
        text: RESET_FAILED,
      };
  }
}
