import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import type { Chain } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { storeNoDbSnackBar } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import { numberWithCommas } from "@utils/utilsCommon";
import { startWarpSync } from "@warpSync/warpSync";
import type { WarpSyncState } from "@warpSync/warpSyncState";

/** Returns false when the save fails. Turning it on imports the snapshot. */
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
  if (warpSync) void startWarpSync(targetChain);
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
    case "failed":
      return `Could not import the event logs published with this site. ${TURN_OFF}`;
    case "none":
      return "This site has no event logs of this chain to import.";
    default:
      return `Imports the event logs published with this site when the chain is opened. ${TURN_OFF}`;
  }
}
