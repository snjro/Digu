import type { Chain, ChainName } from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import type { NodeStatus, RpcInputType } from "@db/dbTypes";
import { getNodeProvider } from "@utils/utilsEthers";

export async function updateRpc(
  targetChain: Chain,
  newRpc: string,
): Promise<void> {
  await updateDbItemRpcSettings(targetChain.name, "rpc", newRpc);

  //By calling "getNodeProvider", nodeStatus is updated
  await getNodeProvider(targetChain, newRpc);
}

export async function clearSucceededNodeStatus(
  chainName: ChainName,
  nodeStatus: NodeStatus,
): Promise<void> {
  if (nodeStatus === "SUCCESS") {
    await updateDbItemChainStatus(chainName, "nodeStatus", undefined);
  }
}

export function getToggledRpcInputType(inputType: RpcInputType): RpcInputType {
  return inputType === "text" ? "password" : "text";
}

export async function toggleRpcInputType(
  chainName: ChainName,
  inputType: RpcInputType,
): Promise<void> {
  await updateDbItemRpcSettings(
    chainName,
    "inputType",
    getToggledRpcInputType(inputType),
  );
}
