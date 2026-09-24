import type { ChainName } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import type { RpcConfigParam } from "./rpcConfigParams";

export async function saveRpcConfigValue(
  chainName: ChainName,
  name: RpcConfigParam["name"],
  newValue: number,
): Promise<void> {
  await updateDbItemRpcSettings(chainName, name, newValue);
}
