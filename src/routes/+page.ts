import { browser } from "$app/environment";
import type { ChainName } from "@constants/chains/types";
import { DbSettingsDataHandlers } from "@db/dbSettings";
import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";

export async function load() {
  if (browser) {
    // Get value of "selectedChaninName" from DB instead of Store.
    // Because the value in Store is still default value here.
    // Store values will be updated after "initialized()" in "./+layout.ts".
    const selectedChainName: ChainName =
      await DbSettingsDataHandlers.getDbItemUserSettings(
        "userSetting01",
        "selectedChainName",
      );
    // In a load function, you should use "redirect" instead of "goto"
    // https://kit.svelte.jp/docs/load#redirects
    throw redirect(308, `${base}/${selectedChainName}`);
    // await goto(`${base}/${selectedChainName}`);
  }
}
