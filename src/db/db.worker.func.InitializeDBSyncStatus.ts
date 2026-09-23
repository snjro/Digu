import { DbEventLogs } from "./dbEventLogs";
import type { VersionIdentifier } from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain } from "@constants/chains/types";
import { getSyncLockName } from "./constants";
import { extractEventContracts } from "@utils/utilsEthers";
import { initializeDBSyncStatusForContract } from "./db.worker.func.InitializeDBSyncStatusForContract";

export async function dbWorkerFuncInitializeDBSyncStatus(): Promise<void> {
  // Without Web Locks (insecure context), work as a single tab.
  if (!navigator.locks) {
    await Promise.all(TARGET_CHAINS.map(initializeDBSyncStatusInChain));
    return;
  }
  await Promise.all(
    TARGET_CHAINS.map((targetChain: Chain) =>
      // Skip the chain while another tab syncs it.
      navigator.locks.request(
        getSyncLockName(targetChain.name),
        { ifAvailable: true },
        async (lock: Lock | null): Promise<void> => {
          if (lock) await initializeDBSyncStatusInChain(targetChain);
        },
      ),
    ),
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
      const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
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
