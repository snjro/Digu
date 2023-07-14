import type { ChainName } from "@constants/chains/types";
import { storeLogSettings } from "@stores/storeLogSettings";
import { myLogger } from "@utils/logger";
import {
  getAndUpdateLatestBlockNumber,
  type NodeProvider,
} from "@utils/utilsEthers";
import { get } from "svelte/store";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import type { LogSetting } from "@db/dbTypes";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";

const functionName: string = "updateLatestBlocknumber";

export async function startUpdateLatestBlockNumber(
  targetChainName: ChainName,
  nodeProvider: NodeProvider
): Promise<void> {
  myLogger.info(`START ${functionName}`);
  const logSetting: LogSetting = get(storeLogSettings)[targetChainName];
  const maxErrorCount: number = logSetting.tryCount;
  let errorCount: number = 0;
  let intervalId: number = window.setInterval(async () => {
    let latestBlockNumber: number = 0;

    if (!get(storeSyncStatus)[targetChainName].isSyncing) {
      stopUpdateLatestBlockNumber(intervalId);
      return;
    }

    try {
      latestBlockNumber = await getAndUpdateLatestBlockNumber(
        nodeProvider,
        targetChainName
      );
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
  }, logSetting.blockIntervalMs);
}
function stopUpdateLatestBlockNumber(intervalId: number | undefined) {
  window.clearInterval(intervalId);
  myLogger.info(`STOPPED ${functionName}. intervalId=${intervalId}`);
}
