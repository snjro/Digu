import { fetchEventLogsContract } from "./eventLogsContract";
import { getDbEventLogs, type DbEventLogs } from "#db/dbEventLogs.js";
import type { ContractIdentifier } from "#db/dbTypes.js";
import { destroyNodeProvider, getNodeProvider } from "#utils/utilsEthers.js";
import { getTargetContract } from "#utils/utilsDb.js";
import type { NodeProvider } from "#utils/utilsEthers.js";
import type {
  Chain,
  ChainName,
  Contract,
  ContractName,
} from "#constants/chains/types.js";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { customLogger } from "#utils/logger.js";
import { getUrlObject } from "#utils/utilsCommon.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";
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
  let syncingContracts: ContractIdentifier[] = [];
  return await requestSyncLock(
    targetChain.name,
    async () => {
      await importWarpSyncBeforeSync(targetChain);
      syncingContracts = await startSyncingInChain(targetChain.name);
    },
    () => syncEventLogs(targetChain, syncingContracts),
  );
}
// Syncs the contracts that the start marked as syncing, which the abort
// reaches.
async function syncEventLogs(
  targetChain: Chain,
  syncingContracts: ContractIdentifier[],
): Promise<void> {
  customLogger.start(`Fetch event logs. Chain: ${targetChain.name}`);

  const promiseFetchAndInsertEthersEvents: Promise<void>[] = [];
  const rpc: string = get(storeRpcSettings)[targetChain.name].rpc;
  let nodeProvider: NodeProvider | undefined = undefined;
  let stopUpdateLatestBlockNumber: (() => void) | undefined = undefined;
  try {
    nodeProvider = await getNodeProvider(targetChain, rpc);
    if (nodeProvider === undefined) {
      customLogger.fail("Get provider.", {
        chainName: targetChain.name,
        // Only the host: the rest of the URL may hold an API key.
        rpcHost: getUrlObject(rpc)?.host,
      });
      recordSyncStoppedReason(targetChain.name, "RPC_ERRORS");
      await startAbortingInChain(targetChain.name);
      return;
    }

    stopUpdateLatestBlockNumber = await startUpdateLatestBlockNumber(
      targetChain.name,
      nodeProvider,
    );

    for (const contractIdentifier of syncingContracts) {
      const { chainName, projectName, versionName } = contractIdentifier;
      const dbEventLogs: DbEventLogs = getDbEventLogs({
        chainName,
        projectName,
        versionName,
      });
      const targetContract: Contract = getTargetContract(contractIdentifier);
      promiseFetchAndInsertEthersEvents.push(
        fetchEventLogsContract(dbEventLogs, targetContract, nodeProvider).catch(
          (error: unknown) =>
            abortOnError(targetChain.name, targetContract.name, error),
        ),
      );
    }
  } catch (error) {
    recordSyncStoppedReason(targetChain.name, "UNEXPECTED_ERROR");
    // Stop the contracts that already started, so that the wait below ends.
    await startAbortingInChain(targetChain.name).catch(
      (abortError: unknown) => {
        customLogger.error("Start aborting.", {
          chainName: targetChain.name,
          errorObject: abortError,
        });
      },
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
      await destroyNodeProvider(nodeProvider);
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
  customLogger.error("Fetch event logs. Stop syncing the chain:", {
    chainName: chainName,
    contractName: contractName,
    errorObject: error,
  });
  recordSyncStoppedReason(chainName, "UNEXPECTED_ERROR");
  await startAbortingInChain(chainName).catch((abortError: unknown) => {
    // allSettled would drop it silently.
    customLogger.error("Start aborting.", {
      chainName: chainName,
      errorObject: abortError,
    });
  });
}
