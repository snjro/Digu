import type { ChainName } from "@constants/chains/types";
import { storeLogSettings } from "@stores/storeLogSettings";
import { myLogger } from "@utils/logger";
import {
  getAndUpdateLatestBlockNumber,
  type NodeProvider,
} from "@utils/utilsEthers";
import { get } from "svelte/store";
import {
  countupNodeErrorCount,
  resetNodeErrorCount,
} from "./nodeErrorCountHandler";
import { storeSyncStatus } from "@stores/storeSyncStatus";

const functionName: string = "updateLatestBlocknumber";

export async function startUpdateLatestBlockNumber(
  targetChainName: ChainName,
  nodeProvider: NodeProvider
): Promise<void> {
  myLogger.info(`START ${functionName}`);

  let intervalId: number = window.setInterval(async () => {
    let latestBlockNumber: number = 0;
    if (get(storeSyncStatus)[targetChainName].isSyncing) {
      try {
        latestBlockNumber = await getAndUpdateLatestBlockNumber(
          nodeProvider,
          targetChainName
        );
      } catch (error) {
        myLogger.error(`Error on ${functionName}:`, error);
        if (await countupNodeErrorCount(targetChainName, functionName)) {
          stopUpdateLatestBlockNumber(intervalId);
        }
      }
      if (latestBlockNumber) {
        await resetNodeErrorCount(targetChainName);
      }
    } else {
      stopUpdateLatestBlockNumber(intervalId);
    }
  }, get(storeLogSettings)[targetChainName].blockIntervalMs);
}
function stopUpdateLatestBlockNumber(intervalId: number | undefined) {
  window.clearInterval(intervalId);
  myLogger.info(`STOPPED ${functionName}. intervalId=${intervalId}`);
}
