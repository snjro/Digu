<script lang="ts">
  import { goto } from "$app/navigation";
  import BaseSelect, {
    type BaseSelectProps,
  } from "$lib/base/BaseSelect.svelte";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { TARGET_CHAINS } from "@constants/chains/_index";
  import { updateDbItemUserSettings } from "@db/dbSettingsDataHandlers";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  const items: BaseSelectProps["items"] = TARGET_CHAINS.map(
    (targetChain: Chain) => {
      return {
        name: targetChain.fullName,
        value: targetChain.name,
      };
    },
  );
  async function change(event: Event) {
    //update DB data and stored value
    const chaingedChainName: ChainName = (event.target as HTMLInputElement)
      .value;
    await updateDbItemUserSettings("selectedChainName", chaingedChainName);
    //jump to home
    const rootUrl = `${location.origin}/${chaingedChainName}`;
    goto(rootUrl);
  }
</script>

<BaseSelect
  {items}
  size={sizeSettings.leftSidebarDropdown}
  value={$storeUserSettings.selectedChainName.toString()}
  colorCategoryFront={colorSettings.leftSidebarHeader}
  colorCategoryBg={colorSettings.leftSidebarHeader}
  on:change={change}
/>
