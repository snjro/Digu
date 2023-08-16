<script lang="ts">
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { toggleLeftSideBar } from "$lib/leftSidebar/functions";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
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
