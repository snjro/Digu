<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseSelect from "$lib/base/BaseSelect.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
  import { updateDbItemRpcSettings } from "@db/dbSettingsDataHandlers.js";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  $: targetChainName = $storeUserSettings.selectedChainName.toString();
  $: targetChain = getTargetChain({ chainName: targetChainName });
  $: selectedChainExplorerIndex =
    $storeRpcSettings[targetChainName].chainExplorerIndex;
  $: targetChainExplorers = targetChain.chainExplorers;
  $: targetChainExplorerUrl =
    targetChainExplorers[selectedChainExplorerIndex].url;

  async function change(event: Event) {
    const chainExplorerIndex: number = parseInt(
      (event.target as HTMLInputElement).value,
    );
    await updateDbItemRpcSettings(
      targetChainName,
      "chainExplorerIndex",
      chainExplorerIndex,
    );
  }
  $: items = targetChainExplorers.map((chainExplorer, index) => {
    return { value: index.toString(), name: chainExplorer.name };
  });
</script>

<CommonItemMember text={"Chain Explorer"}>
  <div class="pt-1.5">
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
  </div>
</CommonItemMember>
