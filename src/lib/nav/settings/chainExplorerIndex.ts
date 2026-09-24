import type { ChainName } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";

export async function updateChainExplorerIndex(
  chainName: ChainName,
  selectedValue: string,
): Promise<void> {
  const chainExplorerIndex: number = parseInt(selectedValue);
  await updateDbItemRpcSettings(
    chainName,
    "chainExplorerIndex",
    chainExplorerIndex,
  );
}
