<script lang="ts">
  import { goto } from "$app/navigation";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseSelect, {
    type BaseSelectProps,
  } from "#lib/base/BaseSelect.svelte";
  import { TARGET_CHAINS } from "#constants/chains/_index.js";
  import type { Chain, ChainName } from "#constants/chains/types.js";
  import { storeNoDbSnackBar, storeNodbShowLoader } from "#stores/storeNoDb.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { basePath } from "#lib/common/basePath.js";
  import { getChainRootUrl } from "#lib/common/chainRootUrl.js";
  import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
  import { customLogger } from "#utils/logger.js";
  import { saveSelectedChainName } from "./selectChain";
  const items: BaseSelectProps["items"] = TARGET_CHAINS.map(
    (targetChain: Chain) => {
      return {
        name: targetChain.fullName,
        value: targetChain.name,
      };
    },
  );
  // Bound to the select, because a change sets it before the save. After a
  // failed save the store does not change, so set the saved chain again.
  let selectedChainName: string = $derived(
    $storeUserSettings.selectedChainName.toString(),
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
        selectedChainName = $storeUserSettings.selectedChainName.toString();
        return;
      }
      //jump to home
      const rootUrl = getChainRootUrl(basePath, changedChainName);
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
  bind:value={selectedChainName}
  colorCategoryFront={colorSettings.leftSidebarHeader}
  colorCategoryBg={colorSettings.leftSidebarHeader}
  onchange={change}
  ariaLabel="Chain"
/>
