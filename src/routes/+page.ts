import { goto } from "$app/navigation";
import { get } from "svelte/store";
import { storeUserSettings } from "@stores/storeUserSettings";
import { browser } from "$app/environment";

export async function load() {
  if (browser) {
    goto(`/${get(storeUserSettings).selectedChainName.toString()}`);
  }
}
