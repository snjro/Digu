import type { Chain, ChainName } from "#constants/chains/types.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";
import { get } from "svelte/store";
import {
  reloadSyncStatusInChain,
  runWithSyncLock,
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
// the import ran, and false when this tab held or waited for the lock,
// another tab held it past the timeout, or the import threw in the lock.
type RunningImport = { ran: Promise<boolean>; done: Promise<void> };
const runningImports: Map<ChainName, RunningImport> = new Map();
// Only in this tab: the chains whose large import the user confirmed, and
// those where the user chose "Not now" or stopped the import.
const confirmedChains: Set<ChainName> = new Set();
const heldChains: Set<ChainName> = new Set();

// When a chain is opened, or the warp sync is turned on: imports the
// snapshot while holding the sync lock. A large import waits for the user
// ("confirm"). Skips it while this tab syncs the chain, or when another tab
// holds the lock for longer than the sync waits, so that it is tried again
// the next time.
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
  let end: WarpSyncState | undefined = undefined;
  const ran: Promise<boolean> = withSyncLock(chainName, async () => {
    const result: ImportResult = await runImport(targetChain, true);
    end = result.state;
    return result.reloaded;
  }).finally(() => {
    runningImports.delete(chainName);
    // Only once the lock is released: Retry and Import, shown in the end
    // states, then start a new import instead of getting this one back.
    if (end) setWarpSyncState(chainName, end);
  });
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

// "Retry" in the nav after a failure. A large import that the user did not
// confirm in this tab asks first, as when the chain is opened: the failure may
// have come before the confirmation. When the chain is synced now (the lock is
// held), it says so and the user can choose Retry again.
export async function retryWarpSync(targetChain: Chain): Promise<void> {
  const chainName: ChainName = targetChain.name;
  const before: WarpSyncState = getState(chainName);
  setWarpSyncState(chainName, { ...before, status: "idle", busy: undefined });
  const ran: boolean = await startImport(targetChain).ran;
  if (ran) return;
  setWarpSyncState(chainName, { ...before, busy: true });
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
  const { state } = await runImport(targetChain, false);
  if (state) setWarpSyncState(chainName, state);
}

// Returns the state to set once it ends, and sets the states while it runs.
// ask: a large import that the user did not confirm waits in "confirm";
// without it, such an import is skipped and the state is kept.
async function runImport(
  targetChain: Chain,
  ask: boolean,
): Promise<ImportResult> {
  const chainName: ChainName = targetChain.name;
  // The files are gzip. Nothing is fetched, and the sync fetches the logs.
  if (typeof DecompressionStream === "undefined") {
    customLogger.info("Skip the warp sync: no DecompressionStream.", {
      chainName,
    });
    return { state: { status: "unsupported" }, reloaded: false };
  }
  const before: WarpSyncState = getState(chainName);
  // Turned off while waiting for the lock.
  if (!isWarpSyncOn(chainName)) return { state: undefined, reloaded: false };
  setWarpSyncState(chainName, { status: "checking" });
  const controller = new AbortController();
  setWarpSyncStopController(chainName, controller);
  let manifest: WarpSyncManifest | undefined = undefined;
  // Once a large import failed, while it reads the DB again.
  let failing: boolean = false;
  try {
    manifest = await fetchWarpSyncManifest(targetChain);
    if (!manifest) return { state: { status: "none" }, reloaded: false };
    const pending: WarpSyncPending = await getWarpSyncPending(
      chainName,
      manifest,
    );
    const about = { ...getLastRun(manifest), pending };
    // Stopped while checking: nothing is saved, so the counts stand and the
    // DB need not be read again.
    if (controller.signal.aborted) {
      const state = await endStopped(chainName, { about });
      return { state, reloaded: false };
    }
    const isLarge: boolean = needsConfirmation(pending);
    if (isLarge && !confirmedChains.has(chainName)) {
      return {
        state: ask ? { status: "confirm", ...about } : before,
        reloaded: false,
      };
    }
    // Only a large import shows its progress and can be stopped from the nav.
    let doneLogCount: number = 0;
    const startedAt: number = Date.now();
    const importing = (): WarpSyncState => ({
      status: "importing",
      ...about,
      progress: isLarge ? { doneLogCount, startedAt } : undefined,
      ending: failing
        ? "failing"
        : controller.signal.aborted
          ? "stopping"
          : undefined,
    });
    // With no logs left, it only moves the blocks on while "checking".
    if (pending.logCount > 0) setWarpSyncState(chainName, importing());
    // On Stop at once: the import ends only after the DB is read again.
    if (isLarge) {
      controller.signal.addEventListener(
        "abort",
        () => setWarpSyncState(chainName, importing()),
        { once: true },
      );
    }
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
    // The end state is set once the DB is read again (withSyncLock).
    if (isLarge) {
      setWarpSyncState(chainName, { ...importing(), ending: "finishing" });
    }
    return {
      state: {
        status: toBlock === undefined ? "none" : "imported",
        toBlock,
        createdAt: about.createdAt,
      },
      reloaded: false,
    };
  } catch (error) {
    // Before the reload: a stop while it reads the DB does not turn a failure
    // into a stop.
    if (controller.signal.aborted) {
      const state = await endStopped(chainName, { manifest });
      return { state, reloaded: true };
    }
    // A large import hides Stop while it reads the DB again.
    const shown: WarpSyncState = getState(chainName);
    if (shown.progress) {
      failing = true;
      setWarpSyncState(chainName, { ...shown, ending: "failing" });
    }
    // A file may have been saved before the failure reached this tab.
    await reloadAfterImport(chainName);
    customLogger.error("Import the warp sync snapshot.", {
      chainName,
      errorObject: error,
    });
    return { state: { status: "failed" }, reloaded: true };
  } finally {
    setWarpSyncStopController(chainName, undefined);
  }
}

// The end state, and whether the DB was read into the stores again.
type ImportResult = { state: WarpSyncState | undefined; reloaded: boolean };
function getLastRun(
  manifest: WarpSyncManifest | undefined,
): Pick<WarpSyncState, "toBlock" | "createdAt"> {
  const lastRun = manifest?.runs.at(-1);
  return { toBlock: lastRun?.toBlock, createdAt: lastRun?.createdAt };
}
// The stores follow the DB again.
async function reloadAfterImport(chainName: ChainName): Promise<void> {
  await reloadSyncStatusInChain(chainName).catch((reloadError: unknown) => {
    customLogger.error("Reload the sync status after the warp sync.", {
      chainName,
      errorObject: reloadError,
    });
  });
}
// Every stopped end. The chain is held before anything is awaited, so that
// the warp sync turned on meanwhile is not undone. about: what was counted
// before anything was saved. Without it, a file may have been saved after the
// stop, before its result reached this tab: the DB is read again, and what is
// left is counted after it.
async function endStopped(
  chainName: ChainName,
  end:
    | { about: Pick<WarpSyncState, "toBlock" | "createdAt" | "pending"> }
    | { manifest: WarpSyncManifest | undefined },
): Promise<WarpSyncState> {
  heldChains.add(chainName);
  let about: Pick<WarpSyncState, "toBlock" | "createdAt" | "pending">;
  if ("about" in end) {
    about = end.about;
  } else {
    await reloadAfterImport(chainName);
    about = {
      ...getLastRun(end.manifest),
      pending: end.manifest
        ? await getPendingOrUndefined(chainName, end.manifest)
        : undefined,
    };
  }
  customLogger.info("Stopped the import of the warp sync snapshot.", {
    chainName,
  });
  return { status: "stopped", ...about };
}
// What is left after a stop; undefined when it cannot be read, so that the
// state still leaves "checking" or "importing".
async function getPendingOrUndefined(
  chainName: ChainName,
  manifest: WarpSyncManifest,
): Promise<WarpSyncPending | undefined> {
  try {
    return await getWarpSyncPending(chainName, manifest);
  } catch (error) {
    customLogger.error("Count what is left of the warp sync snapshot.", {
      chainName,
      errorObject: error,
    });
    return undefined;
  }
}

// Returns false when this tab or another tab held the lock, and nothing ran.
// The import is tried again next time. run returns true when it has read the
// DB into the stores itself.
async function withSyncLock(
  chainName: ChainName,
  run: () => Promise<boolean>,
): Promise<boolean> {
  try {
    const ran: boolean = await runWithSyncLock(
      chainName,
      "import",
      async (): Promise<void> => {
        const reloaded: boolean = await run();
        // Without Web Locks (insecure context), work as a single tab.
        if (!navigator.locks || reloaded) return;
        // Another tab may have imported or synced since this tab read the
        // DB, and then this import skips everything.
        await reloadAfterImport(chainName);
      },
    );
    if (!ran) {
      customLogger.info("Skip the warp sync: the chain is synced now.", {
        chainName,
      });
    }
    return ran;
  } catch (error) {
    customLogger.error("Import the warp sync snapshot in the sync lock.", {
      chainName,
      errorObject: error,
    });
    return false;
  }
}
