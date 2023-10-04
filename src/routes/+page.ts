import { browser } from "$app/environment";
import type { ChainName } from "@constants/chains/types";
import { DbSettingsDataHandlers } from "@db/dbSettings";
import { redirect } from "@sveltejs/kit";

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
    // in load function, need to use "redirect" instead of "goto"
    throw redirect(300,`/${selectedChainName}`)
  }
}
