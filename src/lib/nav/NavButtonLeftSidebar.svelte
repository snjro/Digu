<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseButtonIcon from "#lib/base/BaseButtonIcon.svelte";
  import { toggleLeftSideBar } from "#lib/leftSidebar/functions.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
</script>

{#if !$storeUserSettings.isOpenSidebar}
  <BaseButtonIcon
    iconName="menu"
    ariaLabel="Open sidebar"
    size={sizeSettings.navButton}
    colorCategoryFront={colorSettings.navButton}
    colorCategoryBg={colorSettings.navButton}
    onclick={async () => {
      await toggleLeftSideBar();
    }}
  />
{/if}
