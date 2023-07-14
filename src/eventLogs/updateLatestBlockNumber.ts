import type { ChainName } from "@constants/chains/types";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { myLogger } from "@utils/logger";
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
  nodeProvider: NodeProvider
): Promise<void> {
  myLogger.info(`START ${functionName}`);
  const rpcSetting: RpcSetting = get(storeRpcSettings)[targetChainName];
  const maxErrorCount: number = rpcSetting.tryCount;
  let errorCount: number = 0;
  let intervalId: number = window.setInterval(async () => {
    if (!get(storeSyncStatus)[targetChainName].isSyncing) {
      stopUpdateLatestBlockNumber(intervalId);
      return;
    }

    try {
      await getAndUpdateLatestBlockNumber(nodeProvider, targetChainName);
      errorCount = 0;
    } catch (error) {
      errorCount++;
      myLogger.warn({
        errorOn: functionName,
        errorCount: `${errorCount}/${maxErrorCount}`,
        error: error,
      });
    }
    if (errorCount > maxErrorCount) {
      myLogger.error({
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
  window.clearInterval(intervalId);
  myLogger.info(`STOPPED ${functionName}. intervalId=${intervalId}`);
}
