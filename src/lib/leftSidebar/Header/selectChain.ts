import type { ChainName } from "@constants/chains/types";
import { updateDbItemUserSettings } from "@db/dbSettings";

export async function saveSelectedChainName(
  chainName: ChainName,
): Promise<void> {
  await updateDbItemUserSettings("selectedChainName", chainName);
}
export function getChainRootUrl(
  basePath: string,
  chainName: ChainName,
): string {
  return `${basePath}/${chainName}`;
}
