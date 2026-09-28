import type { Chain, ChainName } from "@constants/chains/types";
import { getSyncLockName, SYNC_LOCK_TIMEOUT_MS } from "@db/constants";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { customLogger } from "@utils/logger";
import { get } from "svelte/store";
import {
  isSyncedByThisTab,
  reloadSyncStatusInChain,
  waitForSyncLockRelease,
} from "@eventLogs/syncLock";
import { fetchWarpSyncManifest } from "./warpSyncFetch";
import { importWarpSync } from "./warpSyncImport";
import type { WarpSyncManifest } from "./warpSyncTypes";
import {
  hasWarpSync,
  selectWarpSyncState,
  setWarpSyncState,
  storeWarpSync,
} from "./warpSyncState";

function isWarpSyncOn(chainName: ChainName): boolean {
  return hasWarpSync(chainName) && get(storeRpcSettings)[chainName].warpSync;
}
function isDone(chainName: ChainName): boolean {
  const { status } = selectWarpSyncState(get(storeWarpSync), chainName);
  return status === "imported" || status === "none";
}

// The imports that run in this tab.
const runningImports: Map<ChainName, Promise<void>> = new Map();

// When a chain is opened, or the warp sync is turned on: imports the
// snapshot while holding the sync lock. Skips it when another tab holds the
// lock for longer than the sync waits, so that it is tried again the next time.
export function startWarpSync(targetChain: Chain): Promise<void> {
  const chainName: ChainName = targetChain.name;
  const running: Promise<void> | undefined = runningImports.get(chainName);
  if (running) return running;
  if (!isWarpSyncOn(chainName) || isDone(chainName)) return Promise.resolve();
  const importing: Promise<void> = withSyncLock(chainName, () =>
    runImport(targetChain),
  ).finally(() => runningImports.delete(chainName));
  runningImports.set(chainName, importing);
  return importing;
}

// The sync waits for the import of this tab, instead of failing to get the
// lock that the import holds.
export async function waitForWarpSync(chainName: ChainName): Promise<void> {
  await runningImports.get(chainName);
}

// Before the sync, while it holds the lock: imports what is not imported yet,
// so that the sync goes on from the end of the snapshot. A failure is logged,
// and the sync fetches the logs itself.
export async function importWarpSyncBeforeSync(
  targetChain: Chain,
): Promise<void> {
  if (!isWarpSyncOn(targetChain.name) || isDone(targetChain.name)) return;
  await runImport(targetChain);
}

async function runImport(targetChain: Chain): Promise<void> {
  const chainName: ChainName = targetChain.name;
  setWarpSyncState(chainName, { status: "importing" });
  try {
    const manifest: WarpSyncManifest | undefined =
      await fetchWarpSyncManifest(targetChain);
    if (!manifest) {
      setWarpSyncState(chainName, { status: "none" });
      return;
    }
    const toBlock: number | undefined = await importWarpSync(
      targetChain,
      manifest,
    );
    setWarpSyncState(chainName, {
      status: toBlock === undefined ? "none" : "imported",
      toBlock,
      createdAt: manifest.runs.at(-1)?.createdAt,
    });
  } catch (error) {
    customLogger.error("Import the warp sync snapshot.", {
      chainName,
      errorObject: error,
    });
    setWarpSyncState(chainName, { status: "failed" });
  }
}

async function withSyncLock(
  chainName: ChainName,
  run: () => Promise<void>,
): Promise<void> {
  // Without Web Locks (insecure context), work as a single tab, as the sync:
  // do not import while this tab syncs the chain.
  if (!navigator.locks) {
    if (!isSyncedByThisTab(chainName)) await run();
    return;
  }
  try {
    await navigator.locks.request(
      getSyncLockName(chainName),
      { signal: AbortSignal.timeout(SYNC_LOCK_TIMEOUT_MS) },
      async (): Promise<void> => {
        await run();
        // Another tab may have imported or synced since this tab read the
        // DB, and then this import skips everything.
        await reloadSyncStatusInChain(chainName).catch((error: unknown) => {
          customLogger.error("Reload the sync status after the warp sync.", {
            chainName,
            errorObject: error,
          });
        });
      },
    );
  } catch (error) {
    // A TimeoutError when another tab holds the lock: read the DB when it
    // releases it, as the sync does, and try again next time.
    customLogger.info("Skip the warp sync: the chain is synced now.", {
      chainName,
      errorObject: error,
    });
    waitForSyncLockRelease(chainName);
  }
}
