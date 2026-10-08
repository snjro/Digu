import { fetchEventLogsContract } from "./eventLogsContract";
import { getDbEventLogs, type DbEventLogs } from "#db/dbEventLogs.js";
import type { VersionIdentifier } from "#db/dbTypes.js";
import { extractEventContracts, getNodeProvider } from "#utils/utilsEthers.js";
import type { NodeProvider } from "#utils/utilsEthers.js";
import type {
  Chain,
  ChainName,
  ContractName,
} from "#constants/chains/types.js";
import {
  startSyncingInChain,
  stopSyncingInChain,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { customLogger } from "#utils/logger.js";
import { getUrlObject } from "#utils/utilsCommon.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { abortChainWithReason } from "./syncStoppedReason";
import { get } from "svelte/store";
import { startUpdateLatestBlockNumber } from "./updateLatestBlockNumber";
import { requestSyncLock } from "./syncLock";
import {
  importWarpSyncBeforeSync,
  waitForWarpSync,
} from "#warpSync/warpSync.js";

// Resolves true once every sync target is marked as syncing, so that an abort
// reaches all of them. Resolves false without syncing when the chain is
// already synced (by another tab or by this tab). Waits up to a second for
// another tab that holds the lock briefly. Imports the warp sync snapshot
// first, so that the sync goes on from its end.
export async function fetchEventLogs(targetChain: Chain): Promise<boolean> {
  // The import of this tab holds the lock: wait for it instead.
  await waitForWarpSync(targetChain.name);
  return await requestSyncLock(
    targetChain.name,
    async () => {
      await importWarpSyncBeforeSync(targetChain);
      await startSyncingInChain(targetChain.name);
    },
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
    if (nodeProvider === undefined) {
      // When the abort fails, no contract has started yet, and the finally
      // below still stops the chain.
      await abortChainWithReason(
        targetChain.name,
        "RPC_ERRORS",
        "Get provider.",
        {
          level: "fail",
          // Only the host: the rest of the URL may hold an API key.
          details: { rpcHost: getUrlObject(rpc)?.host },
        },
      );
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
        const dbEventLogs: DbEventLogs = getDbEventLogs(versionIdentifier);
        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
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
  } catch (error) {
    // Stop the contracts that already started, so that the wait below ends.
    await abortChainWithReason(
      targetChain.name,
      "UNEXPECTED_ERROR",
      "Fetch event logs. Stop syncing the chain after an error.",
      { error: error },
    );
    throw error;
  } finally {
    // Wait for every contract, so that none of them syncs after the lock is
    // released.
    await Promise.allSettled(promiseFetchAndInsertEthersEvents);
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
// Stops the whole chain, as when the errors of a contract exceed TRY_COUNT.
async function abortOnError(
  chainName: ChainName,
  contractName: ContractName,
  error: unknown,
): Promise<void> {
  await abortChainWithReason(
    chainName,
    "UNEXPECTED_ERROR",
    "Fetch event logs. Stop syncing the chain:",
    { details: { contractName: contractName }, error: error },
  );
}
