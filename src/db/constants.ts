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

// Web Lock held by the tab that syncs, imports or resets the chain.
export function getSyncLockName(chainName: ChainName): string {
  return `${DB_NAME.firstName}_sync_${chainName}`;
}

// Held exclusive by the same operation, inside the sync lock, for as long as it
// runs. The tabs that wait for its release take it shared, so that a held
// exclusive one is always an operation, also in navigator.locks.query().
export function getSyncPresenceLockName(chainName: ChainName): string {
  return `${DB_NAME.firstName}_syncPresence_${chainName}`;
}

// How long to wait for the sync lock. The Worker of a tab that opens holds it
// briefly, so do not give up at once. A sync, an import or a reset holds it for
// longer.
export const SYNC_LOCK_TIMEOUT_MS: number = 1000;

// How long a tab reads the chain again after another tab's operation, while it
// holds the presence lock shared. A new operation waits for the reading, so a
// reading that hangs (a blocked DB) stops being waited for after this. It
// takes far less: it reads the sync status of each contract of the chain.
export const SYNC_STATUS_RELOAD_TIMEOUT_MS: number = 10_000;
