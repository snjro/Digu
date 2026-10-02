import { browser } from "$app/env";
import type { ChainName } from "#constants/chains/types.js";
import { error, redirect } from "@sveltejs/kit";
import { basePath } from "#lib/common/basePath.js";
import { getChainRootUrl } from "#lib/common/chainRootUrl.js";
import { getDbItemUserSettings } from "#db/dbSettings.js";
import { initialDataUserSettings } from "#db/dbTypes.js";

export async function load() {
  if (browser) {
    // Get value of "selectedChainName" from DB instead of Store.
    // Because the value in Store is still default value here.
    // Store values will be updated after "initialized()" in "./+layout.ts".
    const selectedChainName: ChainName | undefined =
      await getDbItemUserSettings(
        initialDataUserSettings.userSettingsId,
        "selectedChainName",
      );

    // In a load function, you should use "redirect" instead of "goto"
    // https://kit.svelte.jp/docs/load#redirects
    if (selectedChainName) {
      throw redirect(308, getChainRootUrl(basePath, selectedChainName));
    } else {
      throw error(404, "could not get a chain name");
    }
  }
}
