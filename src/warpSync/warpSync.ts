import type { Chain, ChainName } from "#constants/chains/types.js";
import { getSyncLockName, SYNC_LOCK_TIMEOUT_MS } from "#db/constants.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";
import { get } from "svelte/store";
import {
  isSyncedByThisTab,
  reloadSyncStatusInChain,
  waitForSyncLockRelease,
} from "#eventLogs/syncLock.js";
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

// The imports that run in this tab, shared by the callers. ran is true once
// the import ran, and false when another tab held the lock.
type RunningImport = { ran: Promise<boolean>; done: Promise<void> };
const runningImports: Map<ChainName, RunningImport> = new Map();
// Only in this tab: the chains whose large import the user confirmed, and
// those where the user chose "Not now" or stopped the import.
const confirmedChains: Set<ChainName> = new Set();
const heldChains: Set<ChainName> = new Set();

// When a chain is opened, or the warp sync is turned on: imports the
// snapshot while holding the sync lock. A large import waits for the user
// ("confirm"). Skips it when another tab holds the lock for longer than the
// sync waits, so that it is tried again the next time.
export function startWarpSync(targetChain: Chain): Promise<void> {
  return startImport(targetChain).done;
}
function startImport(targetChain: Chain): RunningImport {
  const chainName: ChainName = targetChain.name;
  const running: RunningImport | undefined = runningImports.get(chainName);
  if (running) return running;
  if (
    !isWarpSyncOn(chainName) ||
    isDone(chainName) ||
    heldChains.has(chainName) ||
    getState(chainName).status === "confirm"
  ) {
    const ran: Promise<boolean> = Promise.resolve(true);
    return { ran, done: ran.then(() => {}) };
  }
  const ran: Promise<boolean> = withSyncLock(chainName, () =>
    runImport(targetChain, true),
  ).finally(() => runningImports.delete(chainName));
  const importing: RunningImport = { ran, done: ran.then(() => {}) };
  runningImports.set(chainName, importing);
  return importing;
}

// "Import" of the confirmation, or of the settings after "Not now" or a stop.
// When the chain is synced now (the lock is held), it says so and the user
// can choose Import again.
export async function confirmWarpSync(targetChain: Chain): Promise<void> {
  const chainName: ChainName = targetChain.name;
  const before: WarpSyncState = getState(chainName);
  const wasHeld: boolean = heldChains.has(chainName);
  confirmedChains.add(chainName);
  heldChains.delete(chainName);
  // Firefox keeps the data of a site only up to 10% of the disk unless it is
  // persistent (MDN, Storage quotas and eviction criteria).
  void requestPersistentStorage();
  setWarpSyncState(chainName, { ...before, status: "idle", busy: undefined });
  const ran: boolean = await startImport(targetChain).ran;
  if (ran) return;
  confirmedChains.delete(chainName);
  if (wasHeld || before.status === "confirm") heldChains.add(chainName);
  setWarpSyncState(chainName, {
    ...before,
    status: before.status === "confirm" ? "declined" : before.status,
    busy: true,
  });
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
  await runningImports.get(chainName)?.done;
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
  // Turned off while waiting for the lock.
  if (!isWarpSyncOn(chainName)) return;
  setWarpSyncState(chainName, { status: "importing" });
  const controller = new AbortController();
  setWarpSyncStopController(chainName, controller);
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
    controller.signal.throwIfAborted();
    const about = {
      toBlock: manifest.runs.at(-1)?.toBlock,
      createdAt: manifest.runs.at(-1)?.createdAt,
      pending,
    };
    const isLarge: boolean = needsConfirmation(pending);
    if (isLarge && !confirmedChains.has(chainName)) {
      setWarpSyncState(
        chainName,
        ask ? { status: "confirm", ...about } : before,
      );
      return;
    }
    // Only a large import shows its progress and can be stopped from the nav.
    let doneLogCount: number = 0;
    const startedAt: number = Date.now();
    const importing = (): WarpSyncState => ({
      status: "importing",
      ...about,
      progress: isLarge ? { doneLogCount, startedAt } : undefined,
    });
    setWarpSyncState(chainName, importing());
    const toBlock: number | undefined = await importWarpSync(
      targetChain,
      manifest,
      {
        signal: controller.signal,
        onRangeDone: (chunk) => {
          doneLogCount += chunk.logCount;
          if (isLarge) setWarpSyncState(chainName, importing());
        },
      },
    );
    setWarpSyncState(chainName, {
      status: toBlock === undefined ? "none" : "imported",
      toBlock,
      createdAt: manifest.runs.at(-1)?.createdAt,
    });
  } catch (error) {
    // A file may have been saved after the stop or the timeout, before its
    // result reached this tab: the stores follow the DB again.
    await reloadSyncStatusInChain(chainName).catch((reloadError: unknown) => {
      customLogger.error("Reload the sync status after the warp sync.", {
        chainName,
        errorObject: reloadError,
      });
    });
    if (controller.signal.aborted) {
      customLogger.info("Stopped the import of the warp sync snapshot.", {
        chainName,
      });
      heldChains.add(chainName);
      setWarpSyncState(chainName, {
        status: "stopped",
        toBlock: manifest?.runs.at(-1)?.toBlock,
        createdAt: manifest?.runs.at(-1)?.createdAt,
        pending: manifest
          ? await getPendingOrUndefined(targetChain, manifest)
          : undefined,
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

// What is left after a stop; undefined when it cannot be read, so that the
// state still leaves "importing".
async function getPendingOrUndefined(
  targetChain: Chain,
  manifest: WarpSyncManifest,
): Promise<WarpSyncPending | undefined> {
  try {
    return await getWarpSyncPending(targetChain, manifest);
  } catch (error) {
    customLogger.error("Count what is left of the warp sync snapshot.", {
      chainName: targetChain.name,
      errorObject: error,
    });
    return undefined;
  }
}

// Returns false when another tab held the lock and nothing ran.
async function withSyncLock(
  chainName: ChainName,
  run: () => Promise<void>,
): Promise<boolean> {
  // Do not import while this tab syncs the chain. With Web Locks, the request
  // would wait for this tab's own lock, time out, and be taken for another tab.
  if (isSyncedByThisTab(chainName)) return false;
  // Without Web Locks (insecure context), work as a single tab, as the sync.
  if (!navigator.locks) {
    await run();
    return true;
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
    return true;
  } catch (error) {
    // A TimeoutError when another tab holds the lock: read the DB when it
    // releases it, as the sync does, and try again next time.
    customLogger.info("Skip the warp sync: the chain is synced now.", {
      chainName,
      errorObject: error,
    });
    waitForSyncLockRelease(chainName);
    return false;
  }
}
