import type { ChainName } from "#constants/chains/types.js";
import { updateDbItemUserSettings } from "#db/dbSettings.js";

export async function saveSelectedChainName(
  chainName: ChainName,
): Promise<void> {
  await updateDbItemUserSettings("selectedChainName", chainName);
}
