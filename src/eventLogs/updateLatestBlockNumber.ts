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
// A request of the latest block that has been in flight for longer counts as
// failed, and the next tick starts a new one, so that a request, a body or a
// DB write that hangs does not stop the updates.
export const LATEST_BLOCK_REQUEST_LIMIT_IN_INTERVALS: number = 5;

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
  // The request in flight, if any. A request that was replaced does not count
  // its end.
  let requestInFlight: { startedAt: number } | undefined = undefined;

  const countError = (error: unknown): void => {
    errorCount++;
    customLogger.warn({
      errorOn: functionName,
      errorCount: `${errorCount}/${TRY_COUNT}`,
      error: getLoggableError(error),
    });
  };
  const tryGetAndUpdateLatestBlockNumber = async () => {
    const request = { startedAt: Date.now() };
    requestInFlight = request;
    try {
      await getAndUpdateLatestBlockNumber(nodeProvider, targetChainName);
      if (requestInFlight === request) errorCount = 0;
    } catch (error) {
      // Destroying the provider after stopping cancels the request in flight.
      if (isStopped || requestInFlight !== request) return;
      countError(error);
    } finally {
      if (requestInFlight === request) requestInFlight = undefined;
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
      stop();
      return;
    }
    // One request at a time, so that the requests do not pile up. A late
    // answer of a replaced request does not lower the latest block, which is
    // only raised.
    if (requestInFlight !== undefined) {
      if (
        Date.now() - requestInFlight.startedAt <
        LATEST_BLOCK_REQUEST_LIMIT_IN_INTERVALS * targetChain.blockIntervalMs
      ) {
        return;
      }
      countError(new Error("The request of the latest block did not end."));
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
  };
  const intervalId: number = window.setInterval(() => {
    void updateInInterval();
  }, targetChain.blockIntervalMs);
  // The one way to stop, also from the updates themselves.
  function stop(): void {
    if (isStopped) return;
    isStopped = true;
    const log: string = `Stop ${functionName}(). intervalId=${intervalId}`;
    customLogger.start(log);
    window.clearInterval(intervalId);
    customLogger.finished(log);
  }
  return stop;
}
