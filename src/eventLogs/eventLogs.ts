import { fetchEventLogsContract } from "./eventLogsContract";
import { DbEventLogs } from "@db/dbEventLogs";
import type {
  ContractIdentifier,
  NodeStatus,
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
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { get } from "svelte/store";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import { storeChainStatus } from "@stores/storeChainStatus";

export async function fetchEventLogs(targetChain: Chain): Promise<void> {
  myLogger.info(`[START]logContractsEvents(). targetChain:`, targetChain);

  await startSyncingInChain(targetChain.name);
  const promiseFetchAndInsertEthersEvents: Promise<void>[] = [];

  const nodeProvider: NodeProvider | undefined = await getNodeProvider(
    targetChain.name,
    get(storeRpcSettings)[targetChain.name].rpc
  );
  const nodeStatus: NodeStatus =
    get(storeChainStatus)[targetChain.name].nodeStatus;

  if (nodeProvider === undefined || nodeStatus !== "SUCCESS") {
    myLogger.error("provider error!");
    await startAbortingInChain(targetChain.name);
    await stopSyncingInChain(targetChain.name);
    return;
  }

  await startUpdateLatestBlockNumber(targetChain.name, nodeProvider);

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
          fetchEventLogsContract(
            dbEventLogs,
            targetProject,
            targetVersion,
            targetContract,
            nodeProvider
          )
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
