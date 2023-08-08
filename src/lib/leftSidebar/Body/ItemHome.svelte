<script lang="ts">
  import BaseItem from "./BaseItem.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { directoryItems } from "./directoryDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";

  $: targetChainName = $storeUserSettings.selectedChainName.toString();
</script>

<BaseItem
  label={directoryItems.home.label}
  iconName={directoryItems.home.iconName}
  hrefWithoutUrlHash={`/${targetChainName}`}
  isTopLevelItem={true}
  size={sizeSettings.leftSidebarTree1st}
  hasChildren={false}
  layerLevel={0}
/>
