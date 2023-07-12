<script lang="ts">
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { toggleLeftSideBar } from "../functions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
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
