<script lang="ts">
  import type { BaseButtonProps } from "$lib/base/BaseButton.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  const buttons: {
    iconName: BaseIconProps["name"];
    href: BaseButtonProps["href"];
    tooltipText: BaseButtonProps["tooltipText"];
    tooltipXPosition: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition: BaseButtonProps["tooltipYPosition"];
  }[] = [
    {
      iconName: "github",
      href: "https://github.com/CrystalBallBe", // TODO: Change href
      tooltipText: "GitHub",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
    {
      iconName: "discord",
      href: "https://discord.com/invite/aNBTq55", // TODO: is it OK (that Link to AugurProject)?
      tooltipText: "Discord",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
    {
      iconName: "twitter",
      href: "https://twitter.com/crystalballbe",
      tooltipText: "Twitter",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
    {
      iconName: "handCoinOutline",
      href: "https://etherscan.io/address/0x5aE17FC457FC6A6C6DB8B92f36305e72ae7d792b", // TODO: Change href
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
