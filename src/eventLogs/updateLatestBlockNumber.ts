import type { Chain, ChainName } from "@constants/chains/types";
import { customLogger } from "@utils/logger";
import {
  getAndUpdateLatestBlockNumber,
  getLoggableError,
  type NodeProvider,
} from "@utils/utilsEthers";
import { get } from "svelte/store";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
import { getTargetChain } from "@utils/utilsDb";
import { TRY_COUNT } from "./eventLogsContract";

const functionName: string = "updateLatestBlockNumber";

// Resolves a function that stops the updates.
export async function startUpdateLatestBlockNumber(
  targetChainName: ChainName,
  nodeProvider: NodeProvider,
): Promise<() => void> {
  customLogger.start(`${functionName}()`, {
    chainName: targetChainName,
  });
  const targetChain: Chain = getTargetChain({ chainName: targetChainName });
  let errorCount: number = 0;
  let isStopped: boolean = false;

  const tryGetAndUpdateLatestBlockNumber = async () => {
    try {
      await getAndUpdateLatestBlockNumber(nodeProvider, targetChainName);
      errorCount = 0;
    } catch (error) {
      // Destroying the provider after stopping cancels the request in flight.
      if (isStopped) return;
      errorCount++;
      customLogger.warn({
        errorOn: functionName,
        errorCount: `${errorCount}/${TRY_COUNT}`,
        error: getLoggableError(error),
      });
    }
  };

  // Get the latest block number before updating in the interval.
  // The reason is that the fetching event logs start before the interval starts.
  // And the block number, which is the goal of the fetching event log, is considered 0.
  // To avoid this, get the latest blocknumber here.
  await tryGetAndUpdateLatestBlockNumber();

  // The requests and the aborting catch and log their errors. The rest
  // (reading the store, logging, clearing the interval) is not in a try.
  const updateInInterval = async (): Promise<void> => {
    if (!get(storeSyncStatus)[targetChainName].isSyncing) {
      stopUpdateLatestBlockNumber(intervalId);
      return;
    }

    await tryGetAndUpdateLatestBlockNumber();
    // A request in flight fails when the provider is destroyed after stopping.
    if (isStopped) return;
    if (errorCount > TRY_COUNT) {
      customLogger.error({
        errorOn: functionName,
        errorCount: `${errorCount}/${TRY_COUNT}`,
        errorMessage: "errorCount exceeded the limit. Start aborting.",
      });

      try {
        await startAbortingInChain(targetChainName);
      } catch (error) {
        customLogger.error({
          errorOn: functionName,
          errorMessage: "Failed to start aborting.",
          error: error,
        });
      }
      stopUpdateLatestBlockNumber(intervalId);
    }
  };
  const intervalId: number = window.setInterval(() => {
    void updateInInterval();
  }, targetChain.blockIntervalMs);
  return () => {
    isStopped = true;
    stopUpdateLatestBlockNumber(intervalId);
  };
}
function stopUpdateLatestBlockNumber(intervalId: number | undefined) {
  const log: string = `Stop ${functionName}(). intervalId=${intervalId}`;
  customLogger.start(log);
  window.clearInterval(intervalId);
  customLogger.finished(log);
}
