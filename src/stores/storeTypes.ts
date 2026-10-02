import type { ChainName } from "#constants/chains/types.js";
import type { ChainStatus, RpcSetting, UserSetting } from "#db/dbTypes.js";

export type StateChainStatuses = {
  [key in ChainName]: ChainStatus;
};
export type StateRpcSettings = { [key in ChainName]: RpcSetting };
export type StateUserSettings = UserSetting;
