import type { ChainName } from "#constants/chains/types.js";

// The chain in the URL, not the saved one, which can differ when a URL is opened directly.
export function getPageChainName(
  paramsChainName: string | undefined,
  selectedChainName: ChainName,
): ChainName {
  return paramsChainName ?? selectedChainName;
}
