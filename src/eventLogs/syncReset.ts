import type { Chain, ChainName } from "@constants/chains/types";
import { DB_NAME, getSyncLockName, SYNC_LOCK_TIMEOUT_MS } from "@db/constants";
import { resetDbSyncedData } from "@db/dbResetSyncedData";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { customLogger } from "@utils/logger";
import { forgetWarpSyncConfirmation, startWarpSync } from "@warpSync/warpSync";
import {
  hasWarpSync,
  selectWarpSyncState,
  setWarpSyncState,
  storeWarpSync,
} from "@warpSync/warpSyncState";
import { get } from "svelte/store";
import {
  isSyncedByThisTab,
  reloadSyncStatusInChain,
  waitForSyncLockRelease,
} from "./syncLock";

// "busy": the chain is synced or imported now, and nothing was deleted.
export type SyncResetResult = "reset" | "busy" | "failed";
export type SyncResetOutcome = {
  result: SyncResetResult;
  // 0 unless the result is "reset".
  deletedLogCount: number;
  // The import of the warp sync snapshot that starts after the reset.
  warpSyncImport?: Promise<void>;
};

const SYNC_RESET_CHANNEL_NAME: string = `${DB_NAME.firstName}_syncReset`;
type SyncResetMessage = { chainName: ChainName };

// Deletes the synced data of the chain while holding its sync lock, and then
// imports the warp sync snapshot again when it is on.
export async function resetSyncedData(
  targetChain: Chain,
): Promise<SyncResetOutcome> {
  const chainName: ChainName = targetChain.name;
  const busy: SyncResetOutcome = { result: "busy", deletedLogCount: 0 };
  if (isSyncedByThisTab(chainName) || isImporting(chainName)) return busy;
  let outcome: SyncResetOutcome;
  // Without Web Locks (insecure context), work as a single tab, as the sync.
  if (!navigator.locks) {
    outcome = await resetInLock(targetChain);
  } else {
    try {
      outcome = await navigator.locks.request(
        getSyncLockName(chainName),
        { signal: AbortSignal.timeout(SYNC_LOCK_TIMEOUT_MS) },
        () => resetInLock(targetChain),
      );
    } catch (error) {
      // A TimeoutError when another tab holds the lock.
      customLogger.info("Skip the reset: the chain is synced now.", {
        chainName,
        errorObject: error,
      });
      waitForSyncLockRelease(chainName);
      return busy;
    }
  }
  if (hasWarpSync(chainName) && get(storeRpcSettings)[chainName].warpSync) {
    outcome.warpSyncImport = startWarpSync(targetChain);
  }
  return outcome;
}

function isImporting(chainName: ChainName): boolean {
  return (
    selectWarpSyncState(get(storeWarpSync), chainName).status === "importing"
  );
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
  forgetWarpSyncImport(chainName);
  postSyncReset(chainName);
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

// From the channel that this tab watches, which does not get its own message.
function postSyncReset(chainName: ChainName): void {
  const message: SyncResetMessage = { chainName };
  watchSyncResetsOfOtherTabs()?.postMessage(message);
}

let watchingChannel: BroadcastChannel | undefined;

// The other tabs read the chain again once the resetting tab releases the
// lock, and import the snapshot again the next time.
export function watchSyncResetsOfOtherTabs(): BroadcastChannel | undefined {
  if (typeof BroadcastChannel === "undefined") return undefined;
  if (watchingChannel) return watchingChannel;
  const channel: BroadcastChannel = new BroadcastChannel(
    SYNC_RESET_CHANNEL_NAME,
  );
  watchingChannel = channel;
  channel.addEventListener(
    "message",
    (event: MessageEvent<SyncResetMessage>) => {
      const { chainName } = event.data;
      forgetWarpSyncImport(chainName);
      if (navigator.locks) waitForSyncLockRelease(chainName);
    },
  );
  return channel;
}

// For the tests.
export function stopWatchingSyncResets(): void {
  watchingChannel?.close();
  watchingChannel = undefined;
}
