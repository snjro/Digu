import type { ChainName } from "@constants/chains/types";
import type { ChainStatus, RpcSetting, UserSetting } from "@db/dbTypes";

export type StateChainStatuses = {
  [key in ChainName]: ChainStatus;
};
export type StateRpcSettings = { [key in ChainName]: RpcSetting };
export type StateUserSettings = {
  [key in UserSetting["userSettingsKey"]]: UserSetting["value"];
};
