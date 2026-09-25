import { capitalizeFirstLetter } from "@utils/utilsCommon";
import type { ChainName } from "@constants/chains/types";
import { PROJECT_NAME } from "@utils/utilsConstants";

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
  EventLog: 1,
  Settings: 1,
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

// Web Lock held by the tab that syncs the chain.
export function getSyncLockName(chainName: ChainName): string {
  return `${DB_NAME.firstName}_sync_${chainName}`;
}
