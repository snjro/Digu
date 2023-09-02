import { goto } from "$app/navigation";
import { browser } from "$app/environment";
import type { ChainName } from "@constants/chains/types";
import { DbSettingsDataHandlers } from "@db/dbSettings";

export async function load() {
  if (browser) {
    // Get value of "selectedChaninName" from DB instead of from Store.
    // Because the value in Store is still default value here.
    // Store values will be updated after "initialized()" in "./+layout.ts".
    const selectedChainName: ChainName =
      await DbSettingsDataHandlers.getDbItemUserSettings(
        "userSetting01",
        "selectedChainName",
      );
    goto(`/${selectedChainName}`);
  }
}
