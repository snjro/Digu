<script lang="ts">
  import type { BaseButtonProps } from "$lib/base/BaseButton.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  export let href: BaseButtonProps["href"] = undefined;
  export let openNewTab: BaseButtonProps["openNewTab"] = false;
  export let iconName: BaseIconProps["name"];
  export let tooltipText: BaseButtonProps["tooltipText"] = undefined;
  export let tooltipXPosition: BaseButtonProps["tooltipXPosition"] = "left";
  export let tooltipYPosition: BaseButtonProps["tooltipYPosition"] = "bottom";
</script>

<BaseButtonIcon
  {iconName}
  size={sizeSettings.navButton}
  {href}
  {openNewTab}
  {tooltipText}
  {tooltipXPosition}
  {tooltipYPosition}
  colorCategoryFront={colorSettings.navButton}
  colorCategoryBg={colorSettings.navButton}
  on:click
/>
