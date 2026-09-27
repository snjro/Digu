import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import type { ChainName } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { storeNoDbSnackBar } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";

export async function updateChainExplorerIndex(
  chainName: ChainName,
  selectedValue: string,
): Promise<void> {
  const chainExplorerIndex: number = parseInt(selectedValue);
  try {
    await updateDbItemRpcSettings(
      chainName,
      "chainExplorerIndex",
      chainExplorerIndex,
    );
  } catch (error) {
    customLogger.error("Save the chain explorer.", error);
    storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
  }
}
