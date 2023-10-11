<script lang="ts">
  import { base } from "$app/paths";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import BaseItem from "./BaseItem.svelte";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();
</script>

<BaseItem
  label="Home"
  hrefWithoutUrlHash={`${base}/${targetChainName}`}
  isTopLevelItem={true}
  size={sizeSettings.leftSidebarTree1st}
  hasChildren={false}
  noGrow
/>
