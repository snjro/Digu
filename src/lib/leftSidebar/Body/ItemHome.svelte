<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import BaseItem from "./BaseItem.svelte";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();
</script>

<BaseItem
  label="Home"
  hrefWithoutUrlHash={`/${targetChainName}`}
  isTopLevelItem={true}
  size={sizeSettings.leftSidebarTree1st}
  hasChildren={false}
  noGrow
/>
