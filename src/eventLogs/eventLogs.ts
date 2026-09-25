import { fetchEventLogsContract } from "./eventLogsContract";
import { DbEventLogs } from "@db/dbEventLogs";
import type { NodeStatus, VersionIdentifier } from "@db/dbTypes";
import { extractEventContracts, getNodeProvider } from "@utils/utilsEthers";
import type { NodeProvider } from "@utils/utilsEthers";
import type { Chain, ChainName, ContractName } from "@constants/chains/types";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "@db/dbEventLogsDataHandlersSyncStatus";
import { customLogger } from "@utils/logger";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { get } from "svelte/store";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import { storeChainStatus } from "@stores/storeChainStatus";
import { requestSyncLock } from "./syncLock";

// Resolves true once every sync target is marked as syncing, so that an abort
// reaches all of them. Resolves false without syncing when the chain is
// already synced (by another tab or by this tab). Waits up to a second for
// another tab that holds the lock briefly.
export async function fetchEventLogs(targetChain: Chain): Promise<boolean> {
  return await requestSyncLock(
    targetChain.name,
    () => startSyncingInChain(targetChain.name),
    () => syncEventLogs(targetChain),
  );
}
async function syncEventLogs(targetChain: Chain): Promise<void> {
  customLogger.start(`Fetch event logs. Chain: ${targetChain.name}`);

  const promiseFetchAndInsertEthersEvents: Promise<void>[] = [];
  const rpc: string = get(storeRpcSettings)[targetChain.name].rpc;
  let nodeProvider: NodeProvider | undefined = undefined;
  let stopUpdateLatestBlockNumber: (() => void) | undefined = undefined;
  try {
    nodeProvider = await getNodeProvider(targetChain, rpc);
    const nodeStatus: NodeStatus =
      get(storeChainStatus)[targetChain.name].nodeStatus;

    if (nodeProvider === undefined || nodeStatus !== "SUCCESS") {
      customLogger.fail("Get provider.", {
        chainName: targetChain.name,
        rpc: rpc,
      });
      await startAbortingInChain(targetChain.name);
      return;
    }

    stopUpdateLatestBlockNumber = await startUpdateLatestBlockNumber(
      targetChain.name,
      nodeProvider,
    );

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
          // await setSyncing(dbEventLogs, targetContract.name);
          promiseFetchAndInsertEthersEvents.push(
            fetchEventLogsContract(
              dbEventLogs,
              targetContract,
              nodeProvider,
            ).catch((error: unknown) =>
              abortOnError(targetChain.name, targetContract.name, error),
            ),
          );
        }
      }
    }
    // Wait for every contract, so that none of them syncs after the lock is
    // released.
    await Promise.allSettled(promiseFetchAndInsertEthersEvents);
  } finally {
    stopUpdateLatestBlockNumber?.();
    try {
      // Also stops a contract whose loop ended with an error.
      await stopSyncingInChain(targetChain.name);
    } finally {
      await nodeProvider?.destroy();
    }
  }
  customLogger.finished(
    `Terminated fetch event logs. Chain: ${targetChain.name}`,
  );
}
// Stops the whole chain, as when the errors of a contract exceed Try Count.
async function abortOnError(
  chainName: ChainName,
  contractName: ContractName,
  error: unknown,
): Promise<void> {
  customLogger.error("Fetch event logs. Stop syncing the chain:", {
    chainName: chainName,
    contractName: contractName,
    errorObject: error,
  });
  await startAbortingInChain(chainName).catch((abortError: unknown) => {
    // allSettled would drop it silently.
    customLogger.error("Start aborting.", {
      chainName: chainName,
      errorObject: abortError,
    });
  });
}
