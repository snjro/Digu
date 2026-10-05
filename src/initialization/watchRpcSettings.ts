import { liveQuery, type Subscription } from "dexie";
import { get } from "svelte/store";
import type { Chain, ChainName } from "#constants/chains/types.js";
import { DB_TABLE_NAMES } from "#db/constants.js";
import { dbSettings } from "#db/dbSettings.js";
import type { RpcSetting } from "#db/dbTypes.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import { customLogger } from "#utils/logger.js";
import { getTargetChain } from "#utils/utilsDb.js";
import { getNodeProvider, type NodeProvider } from "#utils/utilsEthers.js";

let subscription: Subscription | undefined;

// Keeps storeRpcSettings in step with the DB, so a setting changed in another
// tab reaches this tab. Dexie passes the other tab's writes on through a
// BroadcastChannel.
export function watchRpcSettings(): Subscription {
  if (subscription && !subscription.closed) return subscription;
  subscription = liveQuery((): Promise<RpcSetting[]> =>
    dbSettings.table(DB_TABLE_NAMES.Settings.rpcSettings).toArray(),
  ).subscribe({
    next: (rpcSettings: RpcSetting[]): void => {
      for (const rpcSetting of rpcSettings) {
        const chainName: ChainName = rpcSetting.chainName;
        const isRpcChanged: boolean =
          get(storeRpcSettings)[chainName].rpc !== rpcSetting.rpc;
        if (isRpcChanged) storeSyncStoppedReason.clear(chainName);
        storeRpcSettings.updateState(chainName, rpcSetting);
        if (isRpcChanged) {
          checkRpc(chainName, rpcSetting.rpc).catch((error: unknown) => {
            customLogger.error("Check the RPC changed in another tab.", {
              chainName,
              errorObject: error,
            });
          });
        }
      }
    },
    error: (error: unknown): void => {
      customLogger.error("Watch RPC settings.", { errorObject: error });
    },
  });
  return subscription;
}

// Updates the node status for the new RPC, as a change in this tab does.
async function checkRpc(chainName: ChainName, rpc: string): Promise<void> {
  const targetChain: Chain = getTargetChain({ chainName });
  const nodeProvider: NodeProvider | undefined = await getNodeProvider(
    targetChain,
    rpc,
  );
  // The provider is used only to check the node here.
  await nodeProvider?.destroy();
}
