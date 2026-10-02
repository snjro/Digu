import { liveQuery, type Subscription } from "dexie";
import { DB_TABLE_NAMES } from "#db/constants.js";
import { dbSettings } from "#db/dbSettings.js";
import type { RpcSetting } from "#db/dbTypes.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";

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
        storeRpcSettings.updateState(rpcSetting.chainName, rpcSetting);
      }
    },
    error: (error: unknown): void => {
      customLogger.error("Watch RPC settings.", { errorObject: error });
    },
  });
  return subscription;
}
