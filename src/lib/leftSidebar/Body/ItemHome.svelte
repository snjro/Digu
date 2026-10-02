<script lang="ts">
  import { basePath } from "#lib/common/basePath.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import { getChainRootUrl } from "#lib/common/chainRootUrl.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import BaseItem from "./BaseItem.svelte";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
</script>

<BaseItem
  label="Home"
  hrefWithoutUrlHash={getChainRootUrl(basePath, targetChainName)}
  isTopLevelItem={true}
  size={sizeSettings.leftSidebarTree1st}
  hasChildren={false}
  noGrow
/>
