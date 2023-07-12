import { fetchEventLogsContract } from "./eventLogsContract";
import { DbEventLogs } from "@db/dbEventLogs";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "@db/dbTypes";
import { extractEventContracts, getNodeProvider } from "@utils/utilsEthers";
import type { NodeProvider } from "@utils/utilsEthers";
import type { Chain } from "@constants/chains/types";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import { myLogger } from "@utils/logger";
import { storeLogSettings } from "@stores/storeLogSettings";
import { get } from "svelte/store";
import { storeSyncStatus } from "@stores/storeSyncStatus";

export async function fetchEventLogs(targetChain: Chain): Promise<void> {
  myLogger.info(`[START]logContractsEvents(). targetChain:`, targetChain);

  await startSyncingInChain(targetChain.name);
  const promiseFetchAndInsertEthersEvents: Promise<void>[] = [];

  const nodeProvider: NodeProvider | undefined = await getNodeProvider(
    targetChain.name,
    get(storeLogSettings)[targetChain.name].rpc
  );
  if (nodeProvider === undefined) {
    myLogger.error("provider error!");
    await startAbortingInChain(targetChain.name);
    await stopSyncingInChain(targetChain.name);
    return;
  }

  for (const targetProject of targetChain.projects) {
    for (const targetVersion of targetProject.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: targetChain.name,
        projectName: targetProject.name,
        versionName: targetVersion.name,
      };
      const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
      for (const targetContract of extractEventContracts(
        targetVersion.contracts
      )) {
        // await setSyncing(dbEventLogs, targetContract.name);
        promiseFetchAndInsertEthersEvents.push(
          fetchEventLogsContract(dbEventLogs, targetContract, nodeProvider)
        );
      }
    }
  }
  await Promise.all(promiseFetchAndInsertEthersEvents);
  myLogger.info(`[END]logContractsEvents`);
}

export const syncStatusContract = (
  contractIdentifier: ContractIdentifier
): SyncStatusContract => {
  const syncStatusContract: SyncStatusContract =
    get(storeSyncStatus)[contractIdentifier.chainName].subSyncStatuses[
      contractIdentifier.projectName
    ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
      contractIdentifier.contractName
    ];
  return syncStatusContract;
};
