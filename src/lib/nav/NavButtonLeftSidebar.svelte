<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { toggleLeftSideBar } from "$lib/leftSidebar/functions";
  import { storeUserSettings } from "@stores/storeUserSettings";
</script>

{#if !$storeUserSettings.isOpenSidebar}
  <BaseButtonIcon
    iconName="menu"
    size={sizeSettings.navButton}
    colorCategoryFront={colorSettings.navButton}
    colorCategoryBg={colorSettings.navButton}
    on:click={async () => {
      await toggleLeftSideBar();
    }}
  />
{/if}
