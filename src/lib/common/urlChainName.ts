import { TARGET_CHAINS } from "@constants/chains/_index";
import type { ChainName } from "@constants/chains/types";

// The chain in the URL to save as the selected chain, or undefined when nothing should be saved.
export function getUrlChainNameToSave(
  paramsChainName: string | undefined,
  selectedChainName: ChainName,
): ChainName | undefined {
  if (paramsChainName === undefined || paramsChainName === selectedChainName) {
    return undefined;
  }
  // An unknown chain shows the 404 page and must not be saved.
  if (!TARGET_CHAINS.some((chain) => chain.name === paramsChainName)) {
    return undefined;
  }
  return paramsChainName;
}
