import type { ChainName } from "@constants/chains/types";

export function getChainRootUrl(
  basePath: string,
  chainName: ChainName,
): string {
  return `${basePath}/${chainName}`;
}
