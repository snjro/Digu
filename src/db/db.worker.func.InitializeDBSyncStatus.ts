import { getDbEventLogs, type DbEventLogs } from "./dbEventLogs";
import type { VersionIdentifier } from "./dbTypes";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain } from "#constants/chains/types.js";
import { getSyncLockName, SYNC_LOCK_TIMEOUT_MS } from "./constants";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { initializeDBSyncStatusForContract } from "./db.worker.func.InitializeDBSyncStatusForContract";

export async function dbWorkerFuncInitializeDBSyncStatus(): Promise<void> {
  // Without Web Locks (insecure context), work as a single tab.
  if (!navigator.locks) {
    await Promise.all(
      TARGET_CHAINS.map((targetChain: Chain) =>
        initializeDBSyncStatusInChain(targetChain),
      ),
    );
    return;
  }
  await Promise.all(
    TARGET_CHAINS.map(async (targetChain: Chain): Promise<void> => {
      // Wait for the readings of other tabs, which are short, and skip the
      // chain while another tab syncs it.
      let granted: boolean = false;
      try {
        await navigator.locks.request(
          getSyncLockName(targetChain.name),
          { signal: AbortSignal.timeout(SYNC_LOCK_TIMEOUT_MS) },
          async (): Promise<void> => {
            granted = true;
            await initializeDBSyncStatusInChain(targetChain);
          },
        );
      } catch (error) {
        const timedOut: boolean =
          error instanceof Error && error.name === "TimeoutError";
        if (granted || !timedOut) throw error;
      }
    }),
  );
}
export async function initializeDBSyncStatusInChain(
  targetChain: Chain,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const targetProject of targetChain.projects) {
    for (const targetVersion of targetProject.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: targetChain.name,
        projectName: targetProject.name,
        versionName: targetVersion.name,
      };
      const dbEventLogs: DbEventLogs = getDbEventLogs(versionIdentifier);
      for (const targetContract of extractEventContracts(
        targetVersion.contracts,
      )) {
        promises.push(
          initializeDBSyncStatusForContract(dbEventLogs, targetContract),
        );
      }
    }
  }
  await Promise.all(promises);
}
