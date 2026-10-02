import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import type { Chain } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { storeNoDbSnackBar } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import { numberWithCommas } from "@utils/utilsCommon";
import { forgetWarpSyncConfirmation, startWarpSync } from "@warpSync/warpSync";
import { stopWarpSync, type WarpSyncState } from "@warpSync/warpSyncState";
import { formatBytes } from "@warpSync/warpSyncTexts";

/**
 * Returns false when the save fails. Turning it on imports the snapshot, or
 * asks first when it is large; turning it off stops the import of this tab.
 */
export async function updateWarpSync(
  targetChain: Chain,
  warpSync: boolean,
): Promise<boolean> {
  try {
    await updateDbItemRpcSettings(targetChain.name, "warpSync", warpSync);
  } catch (error) {
    customLogger.error("Save the warp sync setting.", error);
    storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
    return false;
  }
  if (warpSync) {
    forgetWarpSyncConfirmation(targetChain.name);
    void startWarpSync(targetChain);
  } else {
    stopWarpSync(targetChain.name);
  }
  return true;
}

const TURN_OFF = "Turn it off to fetch logs only from your RPC.";
export function getWarpSyncHelperText(
  isOn: boolean,
  state: WarpSyncState,
): string {
  if (!isOn) return "Off: the logs are fetched only from your RPC.";
  switch (state.status) {
    case "importing":
      return "Importing the event logs published with this site…";
    case "imported":
      return `Imports the event logs published with this site, up to block ${numberWithCommas(
        state.toBlock ?? 0,
      )} (${state.createdAt?.slice(0, 10) ?? "-"}). ${TURN_OFF}`;
    case "confirm":
      return "Waiting for your answer to import the event logs published with this site.";
    case "declined":
    case "stopped": {
      const left: string = state.pending
        ? `Not imported yet: ${numberWithCommas(state.pending.logCount)} logs (${formatBytes(state.pending.bytes)}) are left to import.`
        : "Not imported yet.";
      return state.busy
        ? `Could not import now: the chain is synced. Choose Import when the sync stops. ${left}`
        : left;
    }
    case "failed":
      return `Could not import the event logs published with this site. ${TURN_OFF}`;
    case "none":
      return "This site has no event logs of this chain to import.";
    case "unsupported":
      return "This browser cannot import the event logs published with this site: the logs are fetched only from your RPC.";
    default:
      return `Imports the event logs published with this site when the chain is opened. ${TURN_OFF}`;
  }
}

// "Import" next to the text: after "Not now" or a stop in this tab.
export function canImportNow(isOn: boolean, state: WarpSyncState): boolean {
  return isOn && (state.status === "declined" || state.status === "stopped");
}
