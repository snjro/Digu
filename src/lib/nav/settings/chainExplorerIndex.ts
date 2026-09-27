import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import type { ChainName } from "@constants/chains/types";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { storeNoDbSnackBar } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";

/** Returns false when the save fails. */
export async function updateChainExplorerIndex(
  chainName: ChainName,
  selectedValue: string,
): Promise<boolean> {
  const chainExplorerIndex: number = parseInt(selectedValue);
  try {
    await updateDbItemRpcSettings(
      chainName,
      "chainExplorerIndex",
      chainExplorerIndex,
    );
    return true;
  } catch (error) {
    customLogger.error("Save the chain explorer.", error);
    storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
    return false;
  }
}
