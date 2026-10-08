import type { ChainName } from "#constants/chains/types.js";

// The chain in the URL, not the saved one. +layout.svelte saves the chain in
// the URL, so they differ only until it is saved and when the save fails.
export function getPageChainName(
  paramsChainName: string | undefined,
  selectedChainName: ChainName,
): ChainName {
  return paramsChainName ?? selectedChainName;
}
