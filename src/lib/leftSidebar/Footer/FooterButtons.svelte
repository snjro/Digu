<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import type { BaseButtonProps } from "#lib/base/BaseButton.svelte";
  import BaseButtonIcon from "#lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "#lib/base/BaseIcon.js";
  import { GITHUB_REPOSITORY_URL } from "#utils/utilsConstants.js";

  const buttons: {
    iconName: BaseIconProps["name"];
    href: BaseButtonProps["href"];
    tooltipText: BaseButtonProps["tooltipText"];
    tooltipXPosition: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition: BaseButtonProps["tooltipYPosition"];
  }[] = [
    {
      iconName: "github",
      href: GITHUB_REPOSITORY_URL,
      tooltipText: "GitHub",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
    {
      iconName: "handCoinOutline",
      href: "https://etherscan.io/address/0xfE972d7Ac5475225419d61D44420495A811f80A6",
      tooltipText: "Donation",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
  ];
</script>

{#each buttons as { iconName, href, tooltipText, tooltipXPosition, tooltipYPosition } (href)}
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
  />
{/each}
