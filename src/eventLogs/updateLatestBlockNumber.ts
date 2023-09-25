import type { ChainName } from "@constants/chains/types";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { customLogger } from "@utils/logger";
import {
  getAndUpdateLatestBlockNumber,
  type NodeProvider,
} from "@utils/utilsEthers";
import { get } from "svelte/store";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import type { RpcSetting } from "@db/dbTypes";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";

const functionName: string = "updateLatestBlocknumber";

export async function startUpdateLatestBlockNumber(
  targetChainName: ChainName,
  nodeProvider: NodeProvider,
): Promise<void> {
  customLogger.start(`${functionName}()`, {
    chainName: targetChainName,
    nodeProvider: nodeProvider,
  });
  const rpcSetting: RpcSetting = get(storeRpcSettings)[targetChainName];
  const maxErrorCount: number = rpcSetting.tryCount;
  let errorCount: number = 0;

  const tryGetAndUpdateLatestBlockNumber = async () => {
    try {
      await getAndUpdateLatestBlockNumber(nodeProvider, targetChainName);
      errorCount = 0;
    } catch (error) {
      errorCount++;
      customLogger.warn({
        errorOn: functionName,
        errorCount: `${errorCount}/${maxErrorCount}`,
        error: error,
      });
    }
  };

  // Get the latest block number before updating in the interval.
  // The reason is that the fetching event logs start before the interval starts.
  // And the block number, which is the goal of the fetching event log, is considered 0.
  // To avoid this, get the latest blocknumber here.
  await tryGetAndUpdateLatestBlockNumber();

  let intervalId: number = window.setInterval(async () => {
    if (!get(storeSyncStatus)[targetChainName].isSyncing) {
      stopUpdateLatestBlockNumber(intervalId);
      return;
    }

    await tryGetAndUpdateLatestBlockNumber();
    if (errorCount > maxErrorCount) {
      customLogger.error({
        errorOn: functionName,
        errorCount: `${errorCount}/${maxErrorCount}`,
        errorMessage: "errorCount exceeded the limit. Start aborting.",
      });

      await startAbortingInChain(targetChainName);
      stopUpdateLatestBlockNumber(intervalId);
    }
  }, rpcSetting.blockIntervalMs);
}
function stopUpdateLatestBlockNumber(intervalId: number | undefined) {
  const log: string = `Stop ${functionName}(). intervalId=${intervalId}`;
  customLogger.start(log);
  window.clearInterval(intervalId);
  customLogger.finished(log);
}
