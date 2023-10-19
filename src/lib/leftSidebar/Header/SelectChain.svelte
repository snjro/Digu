<script lang="ts">
  import { goto } from "$app/navigation";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseSelect, {
    type BaseSelectProps,
  } from "$lib/base/BaseSelect.svelte";
  import { TARGET_CHAINS } from "@constants/chains/_index";
  import type { Chain, ChainName } from "@constants/chains/types";
  import { storeNodbShowLoader } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { base } from "$app/paths";
  import { updateDbItemUserSettings } from "@db/dbSettings";
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
    //update DB data and stored value
    const changedChainName: ChainName = (event.target as HTMLInputElement)
      .value;
    await updateDbItemUserSettings("selectedChainName", changedChainName);
    //jump to home
    const rootUrl = `${base}/${changedChainName}`;
    await goto(rootUrl);
    $storeNodbShowLoader = false;
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
