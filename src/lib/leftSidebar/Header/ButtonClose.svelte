<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { toggleLeftSideBar } from "../functions";
  async function clickCloseSidebar() {
    await toggleLeftSideBar();
  }
</script>

<BaseButtonIcon
  iconName="close"
  size={sizeSettings.leftSidebarButton}
  tooltipXPosition="right"
  tooltipYPosition="bottom"
  colorCategoryBg={colorSettings.leftSidebarHeader}
  colorCategoryFront={colorSettings.leftSidebarHeader}
  on:click={clickCloseSidebar}
/>
