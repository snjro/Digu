import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, ChainName } from "#constants/chains/types.js";
import { initializeDBSyncStatusInChain } from "#db/db.worker.func.InitializeDBSyncStatus.js";
import { getDbEventLogs, type DbEventLogs } from "#db/dbEventLogs.js";
import { getDbRecordSyncStatusContract } from "#db/dbEventLogsDataHandlersSyncStatusGetters.js";
import type { SyncStatusContract, VersionIdentifier } from "#db/dbTypes.js";
import { getSyncLockName, SYNC_LOCK_TIMEOUT_MS } from "#db/constants.js";
import { getDbRecordChainStatus } from "#db/dbChainStatusDataHandlers.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { customLogger } from "#utils/logger.js";
import { get, writable, type Writable } from "svelte/store";

// true while another tab holds the sync lock of the chain (its sync, import or
// reset).
export const storeSyncLockedByOtherTab: Writable<Record<ChainName, boolean>> =
  writable(
    Object.fromEntries(TARGET_CHAINS.map((chain) => [chain.name, false])),
  );

// Only one sync, import or reset of a chain runs at a time, in all tabs. It
// holds the sync lock of the chain, and the browser releases it when the tab
// is closed.

// Chains whose sync lock this tab holds or waits for. A request for a lock
// that this tab holds would wait for it, time out, and be taken for another
// tab.
const chainsLockedByThisTab: Set<ChainName> = new Set();

// Runs `run` while holding the sync lock of the chain. Resolves true once
// `run` has finished, or false without running it when this tab holds or
// waits for the lock, or another tab holds it for SYNC_LOCK_TIMEOUT_MS.
// Rejects when `run` throws.
export async function runWithSyncLock(
  chainName: ChainName,
  run: () => Promise<void>,
): Promise<boolean> {
  if (chainsLockedByThisTab.has(chainName)) return false;
  chainsLockedByThisTab.add(chainName);
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
          await run();
        },
      );
      return true;
    } catch (error) {
      if (granted) throw error;
      // A TimeoutError: another tab holds the lock.
      customLogger.info("The sync lock was not granted.", {
        chainName,
        errorObject: error,
      });
      waitForSyncLockRelease(chainName);
      return false;
    }
  } finally {
    chainsLockedByThisTab.delete(chainName);
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
    runWithSyncLock(chainName, async (): Promise<void> => {
      const started: boolean = await tryToStart(chainName, async () => {
        // The store may be stale: another tab may have synced since this tab
        // was opened, or left flags behind when it was closed.
        if (navigator.locks) await resetSyncStatusInChain(chainName);
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

// Resets each free chain, and waits for the others to be released. The
// startup reset in the Worker skips a chain another tab syncs, and that tab
// may have been closed since then.
export async function watchSyncLocksOfOtherTabs(): Promise<void> {
  if (!navigator.locks) return;
  await Promise.all(
    TARGET_CHAINS.map((targetChain: Chain) =>
      navigator.locks.request(
        getSyncLockName(targetChain.name),
        { ifAvailable: true },
        async (lock: Lock | null): Promise<void> => {
          if (lock) {
            // A failure only leaves this chain's status stale; do not fail
            // the startup.
            await resetSyncStatusInChain(targetChain.name).catch(
              (error: unknown) => {
                customLogger.error("Reset sync status at startup.", {
                  chainName: targetChain.name,
                  errorObject: error,
                });
              },
            );
          } else {
            waitForSyncLockRelease(targetChain.name);
          }
        },
      ),
    ),
  );
}

export function waitForSyncLockRelease(chainName: ChainName): void {
  if (get(storeSyncLockedByOtherTab)[chainName]) return;
  storeSyncLockedByOtherTab.update((state) => ({
    ...state,
    [chainName]: true,
  }));
  // Granted when the other tab releases the lock. Give it back right away.
  navigator.locks
    .request(getSyncLockName(chainName), async (): Promise<void> => {
      try {
        await reloadSyncStatusInChain(chainName);
      } catch (error) {
        // A failure only leaves this chain's status stale.
        customLogger.error("Reset sync status after release.", {
          chainName: chainName,
          errorObject: error,
        });
      } finally {
        storeSyncLockedByOtherTab.update((state) => ({
          ...state,
          [chainName]: false,
        }));
      }
    })
    .catch((error: unknown) => {
      customLogger.error("Wait for the sync lock release.", {
        chainName: chainName,
        errorObject: error,
      });
      // The finally of the callback does not run when the request fails.
      storeSyncLockedByOtherTab.update((state) => ({
        ...state,
        [chainName]: false,
      }));
    });
}

// Reads the chain from the DB into the stores, after another tab (or the warp
// sync) changed it. Call only while holding the sync lock of the chain.
export async function reloadSyncStatusInChain(
  chainName: ChainName,
): Promise<void> {
  await resetSyncStatusInChain(chainName);
  // Only the syncing tab updates the latest block number.
  const { latestBlockNumber } = await getDbRecordChainStatus(chainName);
  storeChainStatus.updateState(chainName, { latestBlockNumber });
}

// Call only while holding the sync lock of the chain.
async function resetSyncStatusInChain(chainName: ChainName): Promise<void> {
  const targetChain: Chain = getTargetChain({ chainName: chainName });
  // The Worker counted the records at startup, and the syncing tab keeps the
  // counts in the DB up to date.
  await initializeDBSyncStatusInChain(targetChain, false);

  // Reload the whole records, including fetchedBlockNumber.
  const promises: Promise<void>[] = [];
  for (const targetProject of targetChain.projects) {
    for (const targetVersion of targetProject.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: chainName,
        projectName: targetProject.name,
        versionName: targetVersion.name,
      };
      const dbEventLogs: DbEventLogs = getDbEventLogs(versionIdentifier);
      for (const targetContract of extractEventContracts(
        targetVersion.contracts,
      )) {
        promises.push(
          getDbRecordSyncStatusContract(dbEventLogs, targetContract.name).then(
            (syncStatusContract: SyncStatusContract) => {
              storeSyncStatus.updateState(
                { ...versionIdentifier, contractName: targetContract.name },
                syncStatusContract,
              );
            },
          ),
        );
      }
    }
  }
  await Promise.all(promises);
}
