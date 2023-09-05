<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseButtonProps } from "$lib/base/BaseButton.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";

  const buttons: {
    iconName: BaseIconProps["name"];
    href: BaseButtonProps["href"];
    tooltipText: BaseButtonProps["tooltipText"];
    tooltipXPosition: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition: BaseButtonProps["tooltipYPosition"];
  }[] = [
    {
      iconName: "github",
      href: "https://github.com/snjro/contract-viewer",
      tooltipText: "GitHub",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
    {
      iconName: "handCoinOutline",
      href: "https://etherscan.io/address/0x5aE17FC457FC6A6C6DB8B92f36305e72ae7d792b",
      tooltipText: "Donation",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
  ];
</script>

{#each buttons as { iconName, href, tooltipText, tooltipXPosition, tooltipYPosition }}
  <BaseButtonIcon
    size={sizeSettings.leftSidebarButton}
    {iconName}
    {tooltipText}
    {tooltipXPosition}
    {tooltipYPosition}
    colorCategoryBg={colorSettings.leftSidebarFooter}
    colorCategoryFront={colorSettings.leftSidebarFooter}
    {href}
    shadowEffect={true}
    openNewTab
    on:click
  />
{/each}
