<script lang="ts">
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import BaseSelect from "$lib/base/BaseSelect.svelte";
  import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
  import { updateDbItemLogSettings } from "@db/dbSettingsDataHandlers.js";
  import { storeLogSettings } from "@stores/storeLogSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  $: targetChain = getTargetChain({ chainName: targetChainName });
  $: selectedChainExplorerIndex =
    $storeLogSettings[targetChainName].chainExplorerIndex;
  $: targetChainExplorers = targetChain.chainExplorers;
  $: targetChainExplorerUrl =
    targetChainExplorers[selectedChainExplorerIndex].url;

  async function change(event: Event) {
    const chainExplorerIndex: number = parseInt(
      (event.target as HTMLInputElement).value
    );
    await updateDbItemLogSettings(
      targetChainName,
      "chainExplorerIndex",
      chainExplorerIndex
    );
  }
  $: items = targetChainExplorers.map((chainExplorer, index) => {
    return { value: index.toString(), name: chainExplorer.name };
  });
</script>

<CommonItemMember text={"Chain Explorer"}>
  <BaseSelect
    {items}
    value={selectedChainExplorerIndex.toString()}
    size={sizeSettings.navSettings}
    colorCategoryFront={colorSettings.navSettings}
    colorCategoryBg={colorSettings.navSettings}
    on:change={change}
  />
  <CommonOpenLink
    href={targetChainExplorerUrl}
    text={targetChainExplorerUrl}
    textSize={sizeSettings.navSettings}
  />
</CommonItemMember>
