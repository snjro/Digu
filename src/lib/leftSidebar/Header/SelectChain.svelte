<script lang="ts">
  import { goto } from "$app/navigation";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseSelect, {
    type BaseSelectProps,
  } from "$lib/base/BaseSelect.svelte";
  import { TARGET_CHAINS } from "@constants/chains/_index";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { storeNoDbSnackBar, storeNodbShowLoader } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { base } from "$app/paths";
  import { getChainRootUrl } from "$lib/common/chainRootUrl";
  import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
  import { customLogger } from "@utils/logger";
  import { saveSelectedChainName } from "./selectChain";
  const items: BaseSelectProps["items"] = TARGET_CHAINS.map(
    (targetChain: Chain) => {
      return {
        name: targetChain.fullName,
        value: targetChain.name,
      };
    },
  );
  async function change(event: Event) {
    $storeNodbShowLoader = true;
    try {
      //update DB data and stored value
      const changedChainName: ChainName = (event.target as HTMLInputElement)
        .value;
      try {
        await saveSelectedChainName(changedChainName);
      } catch (error) {
        customLogger.error("Save the selected chain.", error);
        $storeNoDbSnackBar = showSnackBarAsSaveFailed;
        return;
      }
      //jump to home
      const rootUrl = getChainRootUrl(base, changedChainName);
      await goto(rootUrl);
    } finally {
      // The loader covers the whole screen, so hide it even when saving fails.
      $storeNodbShowLoader = false;
    }
  }
</script>

<BaseSelect
  {items}
  size={sizeSettings.leftSidebarDropdown}
  value={$storeUserSettings.selectedChainName.toString()}
  colorCategoryFront={colorSettings.leftSidebarHeader}
  colorCategoryBg={colorSettings.leftSidebarHeader}
  onchange={change}
  ariaLabel="Chain"
/>
