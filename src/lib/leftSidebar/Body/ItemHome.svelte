<script lang="ts">
  import { base } from "$app/paths";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { getChainRootUrl } from "$lib/common/chainRootUrl";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import BaseItem from "./BaseItem.svelte";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
</script>

<BaseItem
  label="Home"
  hrefWithoutUrlHash={getChainRootUrl(base, targetChainName)}
  isTopLevelItem={true}
  size={sizeSettings.leftSidebarTree1st}
  hasChildren={false}
  noGrow
/>
