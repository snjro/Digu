import { DbEventLogs } from "./dbEventLogs";
import type { VersionIdentifier } from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { extractEventContracts } from "@utils/utilsEthers";
import { initializeDBSyncStatusForContract } from "./db.worker.func.InitializeDBSyncStatusForContract";

export async function dbWorkerFuncInitializeDBSyncStatus(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const targetChain of TARGET_CHAINS) {
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
  }
  await Promise.all(promises);
}
