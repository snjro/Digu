import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import type { Chain, ChainName } from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import type { NodeStatus, RpcInputType } from "@db/dbTypes";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeNoDbSnackBar } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import {
  cancelNodeProviderCall,
  getNodeProvider,
  startNodeProviderCall,
  type NodeProvider,
} from "@utils/utilsEthers";
import { get } from "svelte/store";

export async function updateRpc(
  targetChain: Chain,
  newRpc: string,
): Promise<void> {
  const previousNodeStatus: NodeStatus =
    get(storeChainStatus)[targetChain.name].nodeStatus;
  // CONNECTING comes first: the helper label must not show the new RPC with
  // the status of the old one.
  const callNumber: number = await startNodeProviderCall(targetChain.name);
  try {
    await updateDbItemRpcSettings(targetChain.name, "rpc", newRpc);
  } catch (error) {
    await cancelNodeProviderCall(
      targetChain.name,
      callNumber,
      previousNodeStatus,
    );
    throw error;
  }

  //By calling "getNodeProvider", nodeStatus is updated
  const nodeProvider: NodeProvider | undefined = await getNodeProvider(
    targetChain,
    newRpc,
    callNumber,
  );
  // The provider is used only to check the node here.
  await nodeProvider?.destroy();
}

// Enter that ends an IME composition only fixes the text. Safari sends it
// with isComposing false and keyCode 229.
export function blurOnEnter(event: KeyboardEvent): void {
  const isComposing: boolean = event.isComposing || event.keyCode === 229;
  if (event.key === "Enter" && !isComposing) {
    (event.currentTarget as HTMLElement).blur();
  }
}

export async function clearSucceededNodeStatus(
  chainName: ChainName,
  nodeStatus: NodeStatus,
): Promise<void> {
  if (nodeStatus === "SUCCESS") {
    try {
      await updateDbItemChainStatus(chainName, "nodeStatus", undefined);
    } catch (error) {
      customLogger.error("Clear the node status.", error);
      storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
    }
  }
}

export function getToggledRpcInputType(inputType: RpcInputType): RpcInputType {
  return inputType === "text" ? "password" : "text";
}

export async function toggleRpcInputType(
  chainName: ChainName,
  inputType: RpcInputType,
): Promise<void> {
  try {
    await updateDbItemRpcSettings(
      chainName,
      "inputType",
      getToggledRpcInputType(inputType),
    );
  } catch (error) {
    customLogger.error("Save the input type of the RPC.", error);
    storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
  }
}
