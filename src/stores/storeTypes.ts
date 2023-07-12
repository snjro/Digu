import type { ChainName } from "@constants/chains/types";
import type { ChainStatus, LogSetting, UserSetting } from "@db/dbTypes";

export type StateChainStatuses = {
  [key in ChainName]: ChainStatus;
};
export type StateLogSettings = { [key in ChainName]: LogSetting };
export type StateUserSettings = {
  [key in UserSetting["userSettingsKey"]]: UserSetting["value"];
};
