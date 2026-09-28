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
import { getWarpSyncPending, importWarpSync } from "./warpSyncImport";
import type { WarpSyncManifest } from "./warpSyncTypes";
import {
  hasWarpSync,
  needsConfirmation,
  selectWarpSyncState,
  setWarpSyncState,
  setWarpSyncStopController,
  storeWarpSync,
  type WarpSyncPending,
  type WarpSyncState,
} from "./warpSyncState";

function isWarpSyncOn(chainName: ChainName): boolean {
  return hasWarpSync(chainName) && get(storeRpcSettings)[chainName].warpSync;
}
function getState(chainName: ChainName): WarpSyncState {
  return selectWarpSyncState(get(storeWarpSync), chainName);
}
function isDone(chainName: ChainName): boolean {
  const { status } = getState(chainName);
  return status === "imported" || status === "none" || status === "unsupported";
}

// The imports that run in this tab.
const runningImports: Map<ChainName, Promise<void>> = new Map();
// Only in this tab: the chains whose large import the user confirmed, and
// those where the user chose "Not now" or stopped the import.
const confirmedChains: Set<ChainName> = new Set();
const heldChains: Set<ChainName> = new Set();

// When a chain is opened, or the warp sync is turned on: imports the
// snapshot while holding the sync lock. A large import waits for the user
// ("confirm"). Skips it when another tab holds the lock for longer than the
// sync waits, so that it is tried again the next time.
export function startWarpSync(targetChain: Chain): Promise<void> {
  const chainName: ChainName = targetChain.name;
  const running: Promise<void> | undefined = runningImports.get(chainName);
  if (running) return running;
  if (
    !isWarpSyncOn(chainName) ||
    isDone(chainName) ||
    heldChains.has(chainName) ||
    getState(chainName).status === "confirm"
  ) {
    return Promise.resolve();
  }
  const importing: Promise<void> = withSyncLock(chainName, () =>
    runImport(targetChain, true),
  ).finally(() => runningImports.delete(chainName));
  runningImports.set(chainName, importing);
  return importing;
}

// "Import" of the confirmation, or of the settings after "Not now" or a stop.
export function confirmWarpSync(targetChain: Chain): Promise<void> {
  const chainName: ChainName = targetChain.name;
  confirmedChains.add(chainName);
  heldChains.delete(chainName);
  // Firefox keeps the data of a site only up to 10% of the disk unless it is
  // persistent (MDN, Storage quotas and eviction criteria).
  void requestPersistentStorage();
  setWarpSyncState(chainName, { ...getState(chainName), status: "idle" });
  return startWarpSync(targetChain);
}

// "Not now", or the confirmation closed: not asked again in this tab.
export function declineWarpSync(chainName: ChainName): void {
  heldChains.add(chainName);
  setWarpSyncState(chainName, { ...getState(chainName), status: "declined" });
}

// After a reset of the chain: it is asked again before a large import.
export function forgetWarpSyncConfirmation(chainName: ChainName): void {
  confirmedChains.delete(chainName);
  heldChains.delete(chainName);
}

async function requestPersistentStorage(): Promise<void> {
  try {
    const persisted: boolean | undefined = await navigator.storage?.persist?.();
    customLogger.info("Persistent storage for the warp sync.", { persisted });
  } catch (error) {
    customLogger.info("Persistent storage for the warp sync.", {
      errorObject: error,
    });
  }
}

// The sync waits for the import of this tab, instead of failing to get the
// lock that the import holds.
export async function waitForWarpSync(chainName: ChainName): Promise<void> {
  await runningImports.get(chainName);
}

// Before the sync, while it holds the lock: imports what is not imported yet,
// so that the sync goes on from the end of the snapshot. A large import that
// the user did not confirm is skipped, and the sync fetches the logs itself,
// as after a failure, which is logged.
export async function importWarpSyncBeforeSync(
  targetChain: Chain,
): Promise<void> {
  const chainName: ChainName = targetChain.name;
  if (!isWarpSyncOn(chainName) || isDone(chainName)) return;
  if (heldChains.has(chainName)) return;
  await runImport(targetChain, false);
}

// ask: a large import that the user did not confirm waits in "confirm";
// without it, such an import is skipped and the state is kept.
async function runImport(targetChain: Chain, ask: boolean): Promise<void> {
  const chainName: ChainName = targetChain.name;
  // The files are gzip. Nothing is fetched, and the sync fetches the logs.
  if (typeof DecompressionStream === "undefined") {
    customLogger.info("Skip the warp sync: no DecompressionStream.", {
      chainName,
    });
    setWarpSyncState(chainName, { status: "unsupported" });
    return;
  }
  const before: WarpSyncState = getState(chainName);
  setWarpSyncState(chainName, { status: "importing" });
  const controller = new AbortController();
  let manifest: WarpSyncManifest | undefined = undefined;
  try {
    manifest = await fetchWarpSyncManifest(targetChain);
    if (!manifest) {
      setWarpSyncState(chainName, { status: "none" });
      return;
    }
    const pending: WarpSyncPending = await getWarpSyncPending(
      targetChain,
      manifest,
    );
    const about = {
      toBlock: manifest.runs.at(-1)?.toBlock,
      createdAt: manifest.runs.at(-1)?.createdAt,
      pending,
      totalLogCount: manifest.totals.logCount,
    };
    if (needsConfirmation(pending) && !confirmedChains.has(chainName)) {
      setWarpSyncState(
        chainName,
        ask ? { status: "confirm", ...about } : before,
      );
      return;
    }
    setWarpSyncStopController(chainName, controller);
    let doneLogCount: number = 0;
    const startedAt: number = Date.now();
    setWarpSyncState(chainName, {
      status: "importing",
      ...about,
      progress: { doneLogCount, startedAt },
    });
    const toBlock: number | undefined = await importWarpSync(
      targetChain,
      manifest,
      {
        signal: controller.signal,
        onRangeDone: (chunk) => {
          doneLogCount += chunk.logCount;
          setWarpSyncState(chainName, {
            status: "importing",
            ...about,
            progress: { doneLogCount, startedAt },
          });
        },
      },
    );
    setWarpSyncState(chainName, {
      status: toBlock === undefined ? "none" : "imported",
      toBlock,
      createdAt: manifest.runs.at(-1)?.createdAt,
    });
  } catch (error) {
    if (controller.signal.aborted && manifest) {
      customLogger.info("Stopped the import of the warp sync snapshot.", {
        chainName,
      });
      heldChains.add(chainName);
      setWarpSyncState(chainName, {
        status: "stopped",
        toBlock: manifest.runs.at(-1)?.toBlock,
        createdAt: manifest.runs.at(-1)?.createdAt,
        pending: await getWarpSyncPending(targetChain, manifest),
        totalLogCount: manifest.totals.logCount,
      });
      return;
    }
    customLogger.error("Import the warp sync snapshot.", {
      chainName,
      errorObject: error,
    });
    setWarpSyncState(chainName, { status: "failed" });
  } finally {
    setWarpSyncStopController(chainName, undefined);
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
