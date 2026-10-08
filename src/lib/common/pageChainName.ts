import type { ChainName } from "#constants/chains/types.js";

// The chain in the URL, not the saved one. +layout.svelte saves the chain in
// the URL, so they differ only until it is saved, when the save fails, and
// for a chain that is not known (the 404 page), which is never saved.
export function getPageChainName(
  paramsChainName: string | undefined,
  selectedChainName: ChainName,
): ChainName {
  return paramsChainName ?? selectedChainName;
}
