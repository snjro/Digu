import type { Chain, ChainName } from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import type { NodeStatus, RpcInputType } from "@db/dbTypes";
import { getNodeProvider, type NodeProvider } from "@utils/utilsEthers";

export async function updateRpc(
  targetChain: Chain,
  newRpc: string,
): Promise<void> {
  await updateDbItemRpcSettings(targetChain.name, "rpc", newRpc);

  //By calling "getNodeProvider", nodeStatus is updated
  const nodeProvider: NodeProvider | undefined = await getNodeProvider(
    targetChain,
    newRpc,
  );
  // The provider is used only to check the node here.
  await nodeProvider?.destroy();
}

// Enter that ends an IME composition only fixes the text.
export function blurOnEnter(event: KeyboardEvent): void {
  if (event.key === "Enter" && !event.isComposing) {
    (event.currentTarget as HTMLElement).blur();
  }
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
