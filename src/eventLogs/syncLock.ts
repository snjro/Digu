import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, ChainName } from "#constants/chains/types.js";
import {
  DB_NAME,
  getSyncLockName,
  SYNC_LOCK_TIMEOUT_MS,
} from "#db/constants.js";
import { getDbRecordChainStatus } from "#db/dbChainStatusDataHandlers.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";
import { customLogger } from "#utils/logger.js";
import {
  loadSyncStatusInChain,
  type SyncStatusLoad,
} from "#db/dbEventLogsDataHandlersSyncStatusLoad.js";
import { createTabChannel } from "./tabChannel";
import {
  get,
  readonly,
  writable,
  type Readable,
  type Writable,
} from "svelte/store";

// true while another tab's operation (a sync, an import or a reset) holds the
// chain, and then while this tab reads the chain again after it
// (waitForSyncLockRelease). The activity of a chain reads it.
export const storeSyncLockedByOtherTab: Writable<Record<ChainName, boolean>> =
  writable(
    Object.fromEntries(TARGET_CHAINS.map((chain) => [chain.name, false])),
  );

// Only one sync, import or reset of a chain runs at a time, in all tabs. It
// holds the sync lock of the chain, and the browser releases it when the tab
// is closed.

export type SyncLockKind = "sync" | "import" | "reset";

// The operation of this tab that holds or waits for the sync lock of each
// chain. A request for a lock that this tab holds would wait for it, time
// out, and be taken for another tab.
const chainsLockedByThisTab: Writable<
  Partial<Record<ChainName, SyncLockKind>>
> = writable({});
export const storeSyncLockedByThisTab: Readable<
  Partial<Record<ChainName, SyncLockKind>>
> = readonly(chainsLockedByThisTab);

// Runs `run` while holding the sync lock of the chain exclusive. Resolves true
// once `run` has finished, or false without running it when this tab holds or
// waits for the lock, or another tab holds it for SYNC_LOCK_TIMEOUT_MS: an
// operation, or the readings after one, which hold it shared at the same time.
// Rejects when `run` throws.
export async function runWithSyncLock(
  chainName: ChainName,
  kind: SyncLockKind,
  run: () => Promise<void>,
): Promise<boolean> {
  if (get(chainsLockedByThisTab)[chainName]) return false;
  chainsLockedByThisTab.update((state) => ({ ...state, [chainName]: kind }));
  try {
    // Without Web Locks (insecure context), work as a single tab.
    if (!navigator.locks) {
      await run();
      return true;
    }
    let granted: boolean = false;
    try {
      await navigator.locks.request(
        getSyncLockName(chainName),
        { signal: AbortSignal.timeout(SYNC_LOCK_TIMEOUT_MS) },
        async (): Promise<void> => {
          granted = true;
          postSyncLockTaken(chainName);
          await run();
        },
      );
      return true;
    } catch (error) {
      if (granted) throw error;
      // A TimeoutError when another tab holds the lock.
      const context = { chainName, errorObject: error };
      if (error instanceof Error && error.name === "TimeoutError") {
        customLogger.info("The sync lock was not granted.", context);
      } else {
        customLogger.error("The sync lock was not granted.", context);
      }
      waitForSyncLockRelease(chainName);
      return false;
    }
  } finally {
    chainsLockedByThisTab.update((state) => {
      const rest = { ...state };
      delete rest[chainName];
      return rest;
    });
  }
}

// Runs `start` and then `sync` while holding the lock. Resolves true once
// `start` has finished, or false when runWithSyncLock() does not run it or the
// sync could not be started.
export async function requestSyncLock(
  chainName: ChainName,
  start: () => Promise<void>,
  sync: () => Promise<void>,
): Promise<boolean> {
  return await new Promise((resolve) => {
    runWithSyncLock(chainName, "sync", async (): Promise<void> => {
      const started: boolean = await tryToStart(chainName, async () => {
        // The store may be stale: another tab may have synced since this tab
        // was opened, or left flags behind when it was closed. The Worker
        // counted the records at startup, and the syncing tab keeps the
        // counts in the DB up to date.
        if (navigator.locks) await loadSyncStatusInChain(chainName, "reset");
        await start();
      });
      resolve(started);
      if (started) await sync();
    })
      .then((ran: boolean) => {
        if (!ran) resolve(false);
      })
      .catch((error: unknown) => {
        customLogger.error("Sync event logs.", {
          chainName: chainName,
          errorObject: error,
        });
      });
  });
}

async function tryToStart(
  chainName: ChainName,
  start: () => Promise<void>,
): Promise<boolean> {
  // Only a sync that starts clears the reason of the last one.
  storeSyncStoppedReason.clear(chainName);
  try {
    await start();
    return true;
  } catch (error) {
    customLogger.error("Start syncing.", {
      chainName: chainName,
      errorObject: error,
    });
    recordSyncStoppedReason(chainName, "UNEXPECTED_ERROR");
    return false;
  }
}

// Reads each chain at startup ("startup"), at once if it is free, or else
// once it is released. The recount in the Worker skips a chain another tab
// syncs, and that tab may have been closed since then.
export async function watchSyncLocksOfOtherTabs(): Promise<void> {
  if (!navigator.locks) return;
  // Before the requests below, so that no lock taken in between is missed.
  syncLockChannel.watch();
  watchVisibility();
  await Promise.all(
    TARGET_CHAINS.map((targetChain: Chain) =>
      // Not granted while an operation runs or waits for it. The tabs that
      // read the chain again hold it shared too.
      navigator.locks.request(
        getSyncLockName(targetChain.name),
        { mode: "shared", ifAvailable: true },
        async (lock: Lock | null): Promise<void> => {
          if (lock) {
            // A failure only leaves this chain's status stale; do not fail
            // the startup.
            await loadSyncStatusInChain(targetChain.name, "startup").catch(
              (error: unknown) => {
                customLogger.error("Read the sync status at startup.", {
                  chainName: targetChain.name,
                  errorObject: error,
                });
              },
            );
          } else {
            readChainWhenFree(targetChain.name, "startup");
          }
        },
      ),
    ),
  );
}

// A tab tells the others which chain an operation took, not the state: the
// browser's lock manager keeps it, and releases the locks of a tab that is
// closed or crashes. The others wait for the lock shared, so they read the
// chain again once the operation ends, or at once if it has ended already.
const syncLockChannel = createTabChannel(
  `${DB_NAME.firstName}_syncLock`,
  (chainName: ChainName) => {
    readChainWhenFree(chainName, "release");
  },
);

// A reading after another tab's operation, or the startup's reading of a
// chain that was not free.
type Reading = Extract<SyncStatusLoad, "release" | "startup">;

// The chains that a hidden tab reads once it is shown.
const chainsToReadWhenShown: Map<ChainName, Reading> = new Map();

function isHidden(): boolean {
  return (
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
}

function readChainsWhenShown(): void {
  if (isHidden()) return;
  const chains = [...chainsToReadWhenShown];
  chainsToReadWhenShown.clear();
  for (const [chainName, reading] of chains) {
    readChainWhenFree(chainName, reading);
  }
}

let watchingVisibility: boolean = false;

function watchVisibility(): void {
  if (typeof document === "undefined" || watchingVisibility) return;
  watchingVisibility = true;
  document.addEventListener("visibilitychange", readChainsWhenShown);
}

// Reads the chain once it is released, or, in a hidden tab, once the tab is
// shown: its reading would keep a new operation waiting, for a screen that
// nobody sees.
function readChainWhenFree(chainName: ChainName, reading: Reading): void {
  if (isHidden()) {
    // "startup" writes all that "release" writes.
    if (chainsToReadWhenShown.get(chainName) !== "startup") {
      chainsToReadWhenShown.set(chainName, reading);
    }
    return;
  }
  // Waiting for the sync lock: it waits for the release itself if it is not
  // granted.
  if (!get(chainsLockedByThisTab)[chainName]) {
    waitForSyncLockRelease(chainName, reading);
  }
}

function postSyncLockTaken(chainName: ChainName): void {
  try {
    syncLockChannel.post(chainName);
  } catch (error) {
    customLogger.error("Tell the other tabs about the sync lock.", {
      chainName,
      errorObject: error,
    });
  }
}

// For the tests.
export function stopWatchingSyncLockSignals(): void {
  syncLockChannel.stop();
  if (watchingVisibility) {
    document.removeEventListener("visibilitychange", readChainsWhenShown);
    watchingVisibility = false;
  }
  chainsToReadWhenShown.clear();
  startupReadingsWaiting.clear();
}

// The "startup" reading that a chain waits for, from a call while its wait
// was queued or its reading ran.
const startupReadingsWaiting: Set<ChainName> = new Set();

export function waitForSyncLockRelease(
  chainName: ChainName,
  reading: Reading = "release",
): void {
  if (get(storeSyncLockedByOtherTab)[chainName]) {
    if (reading === "startup") startupReadingsWaiting.add(chainName);
    return;
  }
  storeSyncLockedByOtherTab.update((state) => ({
    ...state,
    [chainName]: true,
  }));
  // Granted once the operation releases the lock. Shared: the tabs that wait
  // read at the same time, and a new operation waits for one reading.
  navigator.locks
    .request(
      getSyncLockName(chainName),
      { mode: "shared" },
      async (): Promise<void> => {
        const load: Reading = startupReadingsWaiting.delete(chainName)
          ? "startup"
          : reading;
        try {
          await readChainAfterRelease(chainName, load);
        } catch (error) {
          // A failure only leaves this chain's status stale.
          customLogger.error("Read the chain again after the release.", {
            chainName: chainName,
            errorObject: error,
          });
        } finally {
          storeSyncLockedByOtherTab.update((state) => ({
            ...state,
            [chainName]: false,
          }));
          // Asked for while this reading ran.
          if (startupReadingsWaiting.delete(chainName)) {
            waitForSyncLockRelease(chainName, "startup");
          }
        }
      },
    )
    .catch((error: unknown) => {
      customLogger.error("Wait for the sync lock release.", {
        chainName: chainName,
        errorObject: error,
      });
      // The finally of the callback does not run when the request fails.
      startupReadingsWaiting.delete(chainName);
      storeSyncLockedByOtherTab.update((state) => ({
        ...state,
        [chainName]: false,
      }));
    });
}

// Reads the chain from the DB into the stores, after another tab (or the warp
// sync) changed it, and resets every row. Call only while holding the sync
// lock of the chain exclusive, for an operation of this tab.
export async function reloadSyncStatusInChain(
  chainName: ChainName,
): Promise<void> {
  await loadSyncStatusInChain(chainName, "reset");
  await readLatestBlockNumber(chainName);
}

// After another tab's operation, with the lock shared. It writes only the
// rows that need it, once of all the tabs that read: their writes would run
// one after another, and hold the lock longer than a new operation waits.
async function readChainAfterRelease(
  chainName: ChainName,
  reading: Reading,
): Promise<void> {
  await loadSyncStatusInChain(chainName, reading);
  await readLatestBlockNumber(chainName);
}

// Only the syncing tab updates the latest block number.
async function readLatestBlockNumber(chainName: ChainName): Promise<void> {
  const { latestBlockNumber } = await getDbRecordChainStatus(chainName);
  storeChainStatus.updateState(chainName, { latestBlockNumber });
}
