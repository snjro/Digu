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

// Web Lock held exclusive by the tab that syncs, imports or resets the chain,
// and shared by the tabs that read the chain again after it.
export function getSyncLockName(chainName: ChainName): string {
  return `${DB_NAME.firstName}_sync_${chainName}`;
}

// How long to wait for the sync lock. Other tabs hold it shared briefly to
// read the sync status again, and the Worker of a tab that opens holds it
// briefly, so do not give up at once. A sync, an import or a reset holds it
// for longer.
export const SYNC_LOCK_TIMEOUT_MS: number = 1000;
