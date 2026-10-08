import { capitalizeFirstLetter } from "#utils/utilsCommon.js";
import type { ChainName } from "#constants/chains/types.js";
import { PROJECT_NAME } from "#utils/utilsConstants.js";

export const DB_NAME = {
  firstName: capitalizeFirstLetter(PROJECT_NAME),
  secondNames: {
    eventLog: "EventLog",
    blockTimes: "BlockTimes",
    settings: "Settings",
    chainStatus: "ChainStatus",
  },
} as const;

// Dexie adds a table without a new version, but deletes one only on an
// upgrade. Raise EventLog when a contract or an event that has logs is
// removed or renamed (not when one is added), and BlockTimes when a chain is
// removed. A version applies to the databases of every chain and version.
// The upgrade deletes the sync statuses of the removed contracts only. The
// events of a sync status follow the ABI at the next startup, when the record
// counts are counted again, and a renamed event, like an added one, does not
// get the logs before the fetched block (#732).
export const DB_VERSIONS = {
  // 2: removed the contracts of Augur version2 that Augur did not deploy.
  EventLog: 2,
  // 2: removed bulkUnit, chainExplorerIndex, blockIntervalMs, tryCount and
  // abortWatchIntervalMs from the RPC settings.
  Settings: 2,
  BlockTimes: 1,
  ChainStatus: 1,
} as const;

export const DB_TABLE_NAMES = {
  EventLog: {
    syncStatus: "SyncStatus",
  },
  Settings: { rpcSettings: "RpcSettings", userSettings: "UserSettings" },
  ChainStatus: "ChainStatus",
} as const;

export const PK_AUTO_INCREMENTED = "++id";

// Web Lock held by the tab that syncs, imports or resets the chain.
export function getSyncLockName(chainName: ChainName): string {
  return `${DB_NAME.firstName}_sync_${chainName}`;
}

// How long to wait for the sync lock. Other tabs hold it briefly to read the
// sync status again, so do not give up at once. A sync, an import or a reset
// holds it for longer.
export const SYNC_LOCK_TIMEOUT_MS: number = 1000;
