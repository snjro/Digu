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
// A request of the latest block that takes longer fails, so that the next one
// is not kept waiting until the timeout of ethers (5 minutes over http).
export const LATEST_BLOCK_REQUEST_LIMIT_IN_INTERVALS: number = 3;

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
    let timeoutId: number | undefined = undefined;
    try {
      await Promise.race([
        getAndUpdateLatestBlockNumber(nodeProvider, targetChainName),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(
            () =>
              reject(new Error("The request of the latest block timed out.")),
            LATEST_BLOCK_REQUEST_LIMIT_IN_INTERVALS *
              targetChain.blockIntervalMs,
          );
        }),
      ]);
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
    } finally {
      window.clearTimeout(timeoutId);
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
      // A request in flight fails when the provider is destroyed after
      // stopping.
      if (isStopped) return;
      if (errorCount > TRY_COUNT) {
        customLogger.error({
          errorOn: functionName,
          errorCount: `${errorCount}/${TRY_COUNT}`,
          errorMessage: "errorCount exceeded the limit. Start aborting.",
        });

        recordSyncStoppedReason(targetChainName, "RPC_ERRORS");
        try {
          await startAbortingInChain(targetChainName);
        } catch (error) {
          customLogger.error({
            errorOn: functionName,
            errorMessage: "Failed to start aborting.",
            error: error,
          });
        }
        stop();
      }
    } catch (error) {
      customLogger.error({
        errorOn: functionName,
        errorMessage: "Failed to update the latest block number.",
        error: getLoggableError(error),
      });
    } finally {
      // Unless stopped, so that an unexpected error does not end the updates.
      if (!isStopped) scheduleUpdate();
    }
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
