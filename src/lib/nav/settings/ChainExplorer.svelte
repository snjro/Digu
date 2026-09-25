<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseSelect from "$lib/base/BaseSelect.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonOpenLink from "$lib/common/CommonOpenLink.svelte";
  import { storeRpcSettings } from "@stores/storeRpcSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import { updateChainExplorerIndex } from "./chainExplorerIndex";
  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let targetChain = $derived(getTargetChain({ chainName: targetChainName }));
  let selectedChainExplorerIndex = $derived(
    $storeRpcSettings[targetChainName].chainExplorerIndex,
  );
  let targetChainExplorers = $derived(targetChain.chainExplorers);
  let targetChainExplorerUrl = $derived(
    targetChainExplorers[selectedChainExplorerIndex].url,
  );

  async function change(event: Event) {
    await updateChainExplorerIndex(
      targetChainName,
      (event.target as HTMLInputElement).value,
    );
  }
  let items = $derived(
    targetChainExplorers.map((chainExplorer, index) => {
      return { value: index.toString(), name: chainExplorer.name };
    }),
  );
</script>

<CommonItemMember text={"Chain Explorer"}>
  <div class="pt-1.5">
    <BaseSelect
      {items}
      value={selectedChainExplorerIndex.toString()}
      size={sizeSettings.navSettings}
      colorCategoryFront={colorSettings.navSettings}
      colorCategoryBg={colorSettings.navSettings}
      onchange={change}
      ariaLabel="Chain Explorer"
    />
    <CommonOpenLink
      href={targetChainExplorerUrl}
      text={targetChainExplorerUrl}
      textSize={sizeSettings.navSettings}
    />
  </div>
</CommonItemMember>
