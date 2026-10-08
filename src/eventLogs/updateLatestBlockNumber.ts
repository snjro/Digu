import type { Chain, ChainName } from "#constants/chains/types.js";
import { customLogger } from "#utils/logger.js";
import {
  getAndUpdateLatestBlockNumber,
  getLoggableError,
  type NodeProvider,
} from "#utils/utilsEthers.js";
import { get } from "svelte/store";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { recordSyncStoppedReason } from "./syncStoppedReason";
import { startAbortingInChain } from "#db/dbEventLogsDataHandlersSyncStatus.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { TRY_COUNT } from "./eventLogsContract";

const functionName: string = "startUpdateLatestBlockNumber";

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

  let timeoutId: number | undefined = undefined;
  const stop = (): void => {
    // The update may have stopped itself before the caller stops it.
    if (isStopped) return;
    isStopped = true;
    const log: string = `Stop ${functionName}(). timeoutId=${timeoutId}`;
    customLogger.start(log);
    window.clearTimeout(timeoutId);
    customLogger.finished(log);
  };
  const update = async (): Promise<void> => {
    try {
      if (!get(storeSyncStatus)[targetChainName].isSyncing) {
        stop();
        return;
      }
      await tryGetAndUpdateLatestBlockNumber();
    } catch (error) {
      // Counted like a failed request, so that the updates do not go on for
      // ever, and end at Try Count.
      if (!isStopped) {
        errorCount++;
        customLogger.error({
          errorOn: functionName,
          errorCount: `${errorCount}/${TRY_COUNT}`,
          errorMessage: "Failed to update the latest block number.",
          error: getLoggableError(error),
        });
      }
    }
    // A request in flight fails when the provider is destroyed after stopping.
    if (isStopped) return;
    if (errorCount > TRY_COUNT) {
      try {
        customLogger.error({
          errorOn: functionName,
          errorCount: `${errorCount}/${TRY_COUNT}`,
          errorMessage: "errorCount exceeded the limit. Start aborting.",
        });
        recordSyncStoppedReason(targetChainName, "RPC_ERRORS");
        await startAbortingInChain(targetChainName);
      } catch (error) {
        customLogger.error({
          errorOn: functionName,
          errorMessage: "Failed to start aborting.",
          error: getLoggableError(error),
        });
      }
      stop();
      return;
    }
    scheduleUpdate();
  };
  // The next request after the last one ends, so that the requests do not
  // pile up and an older answer does not overwrite a newer one.
  const scheduleUpdate = (): void => {
    timeoutId = window.setTimeout(() => {
      void update();
    }, targetChain.blockIntervalMs);
  };
  scheduleUpdate();
  return stop;
}
