import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, ChainName } from "@constants/chains/types";
import { initializeDBSyncStatusInChain } from "@db/db.worker.func.InitializeDBSyncStatus";
import { getDbEventLogs, type DbEventLogs } from "@db/dbEventLogs";
import { getDbRecordSyncStatusContract } from "@db/dbEventLogsDataHandlersSyncStatusGetters";
import type { SyncStatusContract, VersionIdentifier } from "@db/dbTypes";
import { getSyncLockName, SYNC_LOCK_TIMEOUT_MS } from "@db/constants";
import { getDbRecordChainStatus } from "@db/dbChainStatusDataHandlers";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import { getTargetChain } from "@utils/utilsDb";
import { customLogger } from "@utils/logger";
import { get, writable, type Writable } from "svelte/store";

// true while another tab holds the sync lock of the chain.
export const storeSyncLockedByOtherTab: Writable<Record<ChainName, boolean>> =
  writable(
    Object.fromEntries(TARGET_CHAINS.map((chain) => [chain.name, false])),
  );

// Only one tab syncs a chain at a time. The tab holds the sync lock while it
// syncs, and the browser releases it when the tab is closed.

// Chains whose sync lock this tab holds.
const chainsSyncedByThisTab: Set<ChainName> = new Set();

// Runs `start` and then `sync` while holding the lock. Resolves true once
// `start` has finished, or false when the lock is held (by another tab for
// SYNC_LOCK_TIMEOUT_MS, or by this tab) or the sync could not be started.
export async function requestSyncLock(
  chainName: ChainName,
  start: () => Promise<void>,
  sync: () => Promise<void>,
): Promise<boolean> {
  if (chainsSyncedByThisTab.has(chainName)) return false;
  // Without Web Locks (insecure context), work as a single tab.
  if (!navigator.locks) {
    chainsSyncedByThisTab.add(chainName);
    const started: boolean = await tryToStart(chainName, start);
    const syncing: Promise<void> = started ? sync() : Promise.resolve();
    void syncing
      .catch((error: unknown) => {
        customLogger.error("Sync event logs.", {
          chainName: chainName,
          errorObject: error,
        });
      })
      .finally(() => chainsSyncedByThisTab.delete(chainName));
    return started;
  }
  const signal: AbortSignal = AbortSignal.timeout(SYNC_LOCK_TIMEOUT_MS);
  let granted: boolean = false;
  return await new Promise((resolve) => {
    navigator.locks
      .request(
        getSyncLockName(chainName),
        { signal: signal },
        async (): Promise<void> => {
          granted = true;
          chainsSyncedByThisTab.add(chainName);
          try {
            const started: boolean = await tryToStart(chainName, async () => {
              // The store may be stale: another tab may have synced since
              // this tab was opened, or left flags behind when it was closed.
              await resetSyncStatusInChain(chainName);
              await start();
            });
            resolve(started);
            if (started) await sync();
          } finally {
            chainsSyncedByThisTab.delete(chainName);
          }
        },
      )
      .catch((error: unknown) => {
        // Rejected with a TimeoutError when the lock was not granted in time.
        if (!granted) {
          resolve(false);
          waitForSyncLockRelease(chainName);
          return;
        }
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
  try {
    await start();
    return true;
  } catch (error) {
    customLogger.error("Start syncing.", {
      chainName: chainName,
      errorObject: error,
    });
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

function waitForSyncLockRelease(chainName: ChainName): void {
  if (get(storeSyncLockedByOtherTab)[chainName]) return;
  storeSyncLockedByOtherTab.update((state) => ({
    ...state,
    [chainName]: true,
  }));
  // Granted when the other tab releases the lock. Give it back right away.
  navigator.locks
    .request(getSyncLockName(chainName), async (): Promise<void> => {
      try {
        await resetSyncStatusInChain(chainName);
        // Only the syncing tab updates the latest block number.
        const { latestBlockNumber } = await getDbRecordChainStatus(chainName);
        storeChainStatus.updateState(chainName, { latestBlockNumber });
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
    });
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
