import type { BaseSnackbarProps } from "$lib/base/snackbarProps";
import type { SyncStateText, SyncStatusChain } from "@db/dbTypes";
import type { SyncResetOutcome, SyncResetResult } from "@eventLogs/syncReset";
import { numberWithCommas } from "@utils/utilsCommon";
import type { WarpSyncState } from "@warpSync/warpSyncState";

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
  if (conditions.isSyncingInOtherTab) {
    return "The chain is synced in another tab.";
  }
  if (
    conditions.syncStateText === "syncing" ||
    conditions.syncStateText === "stopping"
  ) {
    return "Stop the sync first.";
  }
  if (conditions.isImporting) {
    return "Wait until the logs published with this site are imported.";
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
      ? "The logs published with this site are imported again first. Turn off the warp sync to fetch every log from your RPC."
      : NEXT_SYNC_FETCHES_ALL,
  ];
}

const NEXT_SYNC_FETCHES_ALL =
  "The next sync fetches every log again from your RPC.";

// A line of the result, shown in the confirmation dialog after the reset.
export type ResetResultLine = { text: string; isError: boolean };

// The lines right after the reset, before the import of the warp sync ends.
export function getResetResultLines(
  outcome: SyncResetOutcome,
  chainFullName: string,
): ResetResultLine[] {
  switch (outcome.result) {
    case "busy":
      return [
        {
          text: "The chain is synced now, so nothing was deleted. Stop the sync first.",
          isError: true,
        },
      ];
    case "failed":
      return [
        {
          text: "Reset failed. Some logs may be left. Try again.",
          isError: true,
        },
      ];
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
    default:
      // Skipped: another tab took the lock first.
      return {
        text: "The logs published with this site are imported the next time the chain is opened or synced.",
        isError: false,
      };
  }
}

// Only the failures: the dialog shows the result of a reset.
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
        text: "The chain is synced now. Stop the sync first.",
      };
    case "failed":
      return {
        visible: true,
        iconProps: { name: "close", colorCategory: "error" },
        text: "Reset failed. Try again.",
      };
  }
}
