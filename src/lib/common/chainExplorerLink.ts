import type { BaseAProps } from "$lib/base/BaseA.svelte";
import type { Chain, ChainExplorer, ChainName } from "@constants/chains/types";
import type { StateRpcSettings } from "@stores/storeTypes";
import { numberWithCommas } from "@utils/utilsCommon";
import { getTargetChain } from "@utils/utlisDb";

export type CommonChainExplorerLinkProps = {
  subdirectory: keyof ChainExplorer["subdirectory"];
  value: string | undefined;
  textSize: NonNullable<BaseAProps["textSize"]>;
  forcedClass: BaseAProps["forcedClass"];
  appendClass: BaseAProps["appendClass"];
  withIcon: boolean;
  showCopyButton: boolean;
  isFontMono: boolean;
  justifyEnd: boolean;
};

export function getChainExplorerUrl(
  chainName: ChainName,
  rpcSettings: StateRpcSettings,
): string {
  const targetChain: Chain = getTargetChain({ chainName: chainName });
  return targetChain.chainExplorers[
    rpcSettings[targetChain.name].chainExplorerIndex
  ].url;
}
export function getChainExplorerHref(
  chainExplorerUrl: string,
  subdirectory: CommonChainExplorerLinkProps["subdirectory"],
  value: CommonChainExplorerLinkProps["value"],
): string {
  return `${chainExplorerUrl}/${subdirectory}/${value}`;
}
export function getChainExplorerLinkText(
  subdirectory: CommonChainExplorerLinkProps["subdirectory"],
  value: CommonChainExplorerLinkProps["value"],
): CommonChainExplorerLinkProps["value"] {
  if (value && subdirectory === "block") {
    return numberWithCommas(parseInt(value));
  } else {
    return value;
  }
}
