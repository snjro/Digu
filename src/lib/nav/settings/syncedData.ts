import type { BaseSnackbarProps } from "$lib/base/snackbarProps";
import type { SyncStateText, SyncStatusChain } from "@db/dbTypes";
import type { SyncResetResult } from "@eventLogs/syncReset";

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
      : "The next sync fetches every log again from your RPC.",
  ];
}

export function getResetSnackBar(
  result: SyncResetResult,
  chainFullName: string,
): BaseSnackbarProps {
  switch (result) {
    case "reset":
      return {
        visible: true,
        iconProps: { name: "checkBold", colorCategory: "success" },
        text: `The sync of ${chainFullName} was reset.`,
      };
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
