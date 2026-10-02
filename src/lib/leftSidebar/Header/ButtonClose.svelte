<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseButtonIcon from "#lib/base/BaseButtonIcon.svelte";
  import { toggleLeftSideBar } from "../functions";
  async function clickCloseSidebar() {
    await toggleLeftSideBar();
  }
</script>

<BaseButtonIcon
  iconName="close"
  ariaLabel="Close sidebar"
  size={sizeSettings.leftSidebarButton}
  tooltipXPosition="right"
  tooltipYPosition="bottom"
  colorCategoryBg={colorSettings.leftSidebarHeader}
  colorCategoryFront={colorSettings.leftSidebarHeader}
  onclick={clickCloseSidebar}
/>
