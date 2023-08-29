<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseButtonProps } from "$lib/base/BaseButton.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import {
    storeNoDbOpenLeftSidebarAccordion,
    type OpenStateLeftSidebarAccordion,
  } from "@stores/storeNoDb";
  import classNames from "classnames";
  import { tick } from "svelte";

  async function onClick(openState: OpenStateLeftSidebarAccordion) {
    $storeNoDbOpenLeftSidebarAccordion = openState;
    await tick();
    $storeNoDbOpenLeftSidebarAccordion = undefined;
  }

  const buttons: {
    iconName: BaseIconProps["name"];
    openState: OpenStateLeftSidebarAccordion;
    tooltipText: BaseButtonProps["tooltipText"];
    tooltipXPosition: BaseButtonProps["tooltipXPosition"];
    tooltipYPosition: BaseButtonProps["tooltipYPosition"];
  }[] = [
    {
      iconName: "arrowExpandVertical",
      openState: "openAll",
      tooltipText: "Expand all directory",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
    {
      iconName: "bullesEyeArrow",
      openState: "openCurrentOnly",
      tooltipText: "Expand selected directory",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },

    {
      iconName: "arrowCollapseVertical",
      openState: "closeAll",
      tooltipText: "Collapse all directory",
      tooltipXPosition: "right",
      tooltipYPosition: "top",
    },
  ];
</script>

<div class={classNames("flex", "flex-row", "space-x-2")}>
  {#each buttons as { iconName, openState, tooltipText, tooltipXPosition, tooltipYPosition }}
    <BaseButtonIcon
      size={sizeSettings.leftSidebarButton}
      {iconName}
      {tooltipText}
      {tooltipXPosition}
      {tooltipYPosition}
      colorCategoryBg={colorSettings.leftSidebarHeader}
      colorCategoryFront={colorSettings.leftSidebarHeader}
      on:click={() => {
        onClick(openState);
      }}
    />
  {/each}
</div>
