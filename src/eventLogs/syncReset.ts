import type { Chain, ChainName } from "#constants/chains/types.js";
import { DB_NAME } from "#db/constants.js";
import { resetDbSyncedData } from "#db/dbResetSyncedData.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";
import {
  forgetWarpSyncConfirmation,
  startWarpSync,
} from "#warpSync/warpSync.js";
import { hasWarpSync, setWarpSyncState } from "#warpSync/warpSyncState.js";
import { get } from "svelte/store";
import { reloadSyncStatusInChain, runWithSyncLock } from "./syncLock";
import { createTabChannel } from "./tabChannel";

// "busy": the chain is synced or imported now, and nothing was deleted.
export type SyncResetResult = "reset" | "busy" | "failed";
export type SyncResetOutcome = {
  result: SyncResetResult;
  // 0 unless the result is "reset".
  deletedLogCount: number;
  // The import of the warp sync snapshot that starts after the reset.
  warpSyncImport?: Promise<void>;
};

type SyncResetMessage = { chainName: ChainName };

// Deletes the synced data of the chain while holding its sync lock, and then
// imports the warp sync snapshot again when it is on.
export async function resetSyncedData(
  targetChain: Chain,
): Promise<SyncResetOutcome> {
  const chainName: ChainName = targetChain.name;
  const busy: SyncResetOutcome = { result: "busy", deletedLogCount: 0 };
  let outcome: SyncResetOutcome = busy;
  let ran: boolean;
  try {
    ran = await runWithSyncLock(chainName, "reset", async () => {
      outcome = await resetInLock(targetChain);
    });
  } catch (error) {
    customLogger.error("Reset the synced data in the sync lock.", {
      chainName,
      errorObject: error,
    });
    return { result: "failed", deletedLogCount: 0 };
  }
  if (!ran) {
    customLogger.info("Skip the reset: the chain is synced now.", {
      chainName,
    });
    return busy;
  }
  if (hasWarpSync(chainName) && get(storeRpcSettings)[chainName].warpSync) {
    outcome.warpSyncImport = startWarpSync(targetChain);
  }
  return outcome;
}

async function resetInLock(targetChain: Chain): Promise<SyncResetOutcome> {
  const chainName: ChainName = targetChain.name;
  let outcome: SyncResetOutcome;
  try {
    const deletedLogCount: number = await resetDbSyncedData(targetChain);
    outcome = { result: "reset", deletedLogCount };
  } catch (error) {
    customLogger.error("Reset the synced data.", {
      chainName,
      errorObject: error,
    });
    outcome = { result: "failed", deletedLogCount: 0 };
  }
  // Even after a failure: some versions may have been reset.
  try {
    forgetWarpSyncImport(chainName);
  } catch (error) {
    customLogger.error("Forget the warp sync import after the reset.", {
      chainName,
      errorObject: error,
    });
  }
  try {
    postSyncReset(chainName);
  } catch (error) {
    customLogger.error("Tell the other tabs about the reset.", {
      chainName,
      errorObject: error,
    });
  }
  await reloadSyncStatusInChain(chainName).catch((error: unknown) => {
    customLogger.error("Reload the sync status after the reset.", {
      chainName,
      errorObject: error,
    });
  });
  return outcome;
}

// "imported" is kept only in memory, and would skip the next import. A large
// import is asked again, even if it was confirmed in this tab.
function forgetWarpSyncImport(chainName: ChainName): void {
  forgetWarpSyncConfirmation(chainName);
  setWarpSyncState(chainName, { status: "idle" });
}

// The other tabs import the snapshot again the next time. They read the chain
// again from the signal of the sync lock, which the reset holds.
const syncResetChannel = createTabChannel<SyncResetMessage>(
  `${DB_NAME.firstName}_syncReset`,
  ({ chainName }: SyncResetMessage) => forgetWarpSyncImport(chainName),
);

function postSyncReset(chainName: ChainName): void {
  syncResetChannel.post({ chainName });
}

export function watchSyncResetsOfOtherTabs(): void {
  syncResetChannel.watch();
}

// For the tests.
export function stopWatchingSyncResets(): void {
  syncResetChannel.stop();
}
