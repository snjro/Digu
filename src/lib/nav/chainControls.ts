import type { NodeStatus } from "#db/dbTypes.js";
import type { ChainActivity } from "#eventLogs/chainActivity.js";
import type { WarpSyncState } from "#warpSync/warpSyncState.js";
import {
  STOP_THE_SYNC_FIRST,
  WAIT_UNTIL_THE_SYNC_STOPS,
} from "./settings/syncedData";

// The rules of the controls of a chain, for each activity of the chain.

export type SyncToggleConditions = {
  nodeStatus: NodeStatus;
  isSyncTarget: boolean;
  isToggleOn: boolean;
  // From the click until the sync has started: stopping it then would miss
  // some contracts.
  isStarting: boolean;
};

export function isSyncToggleDisabled(
  activity: ChainActivity,
  conditions: SyncToggleConditions,
): boolean {
  const isAbleToSync: boolean =
    conditions.nodeStatus === "SUCCESS" && conditions.isSyncTarget;
  switch (activity) {
    // Unlike the other controls, a small import does not disable it: the
    // sync waits for it.
    case "free":
    case "smallImport":
      return (!conditions.isToggleOn && !isAbleToSync) || conditions.isStarting;
    // A running sync can be stopped even when the node is not ready. Off, it
    // starts or ends, and the lock would refuse a new sync.
    case "syncing":
      return !conditions.isToggleOn || conditions.isStarting;
    // The nav has Stop for a large import.
    case "largeImport":
    case "stopping":
    case "otherTab":
    case "resetting":
      return true;
  }
}

// Why the reset cannot run now, or undefined when it can.
export function getResetDisabledReason(
  activity: ChainActivity,
): string | undefined {
  switch (activity) {
    case "free":
      return undefined;
    case "resetting":
      return "Resetting…";
    // The panel says that the chain is synced in another tab.
    case "otherTab":
      return "Stop the sync in the other tab first.";
    case "syncing":
      return STOP_THE_SYNC_FIRST;
    // "stop sync" was pressed: the contracts end what they are doing first.
    case "stopping":
      return WAIT_UNTIL_THE_SYNC_STOPS;
    // The nav has "Stop" for a large import.
    case "smallImport":
    case "largeImport":
      return "Wait until the logs published with this site are imported, or stop the import.";
  }
}

// "Import" next to the text of the warp sync: after "Not now" or a stop in
// this tab.
export function canImportNow(
  activity: ChainActivity,
  isOn: boolean,
  state: WarpSyncState,
): boolean {
  const isHeld: boolean =
    state.status === "declined" || state.status === "stopped";
  switch (activity) {
    // Unlike the other controls, also while the chain is busy: Import then
    // says that the chain is synced, and can be chosen again.
    case "free":
    case "syncing":
    case "stopping":
    case "otherTab":
    case "smallImport":
    case "largeImport":
    case "resetting":
      return isOn && isHeld;
  }
}

// The sync target checkbox and the RPC input: the settings of a busy chain
// cannot change, in any tab.
export function isChainSettingDisabled(activity: ChainActivity): boolean {
  switch (activity) {
    case "free":
      return false;
    case "syncing":
    case "stopping":
    case "otherTab":
    case "smallImport":
    case "largeImport":
    case "resetting":
      return true;
  }
}
