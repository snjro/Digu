<script lang="ts" context="module">
  export type PageWrapperContentFunctionBarButtonsDefinition = Array<
    SimplifiedButtonDefinition[]
  >;
  export const fullScreenButtonDefinition = (
    isFullScreen: boolean,
  ): Omit<SimplifiedButtonDefinition, "onClickEventFunction"> => {
    return {
      iconName: isFullScreen ? "fullScreenExit" : "fullScreen",
      tooltipText: isFullScreen ? "Exit" : "Full screen",
      tooltipXPosition: "left",
      tooltipYPosition: "top",
    };
  };
</script>

<script lang="ts">
  import type { PageWrapperContentFunctionBarDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import PageWrapperContentFunctionBarButtonsThreeDots from "$lib/PageWrapper/PageWrapperContentFunctionBarButtonsThreeDots.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
  import BaseButtonIcon, {
    type SimplifiedButtonDefinition,
  } from "$lib/base/BaseButtonIcon.svelte";
  import BaseDividerVertical from "$lib/base/BaseDividerVertical.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let functionBarDefinition: PageWrapperContentFunctionBarDefinition;

  let showThreeDotsButtonResponsive: () => boolean;
  $: showThreeDotsButtonResponsive = (): boolean => {
    if (!functionBarDefinition.showThreeDotsButton) return false;
    if ($storeNoDbCurrentWidth <= breakPointWidths.sm) return true;
    if (
      $storeNoDbCurrentWidth <=
        functionBarDefinition.breakPointWidthForOpendSidebar &&
      $storeUserSettings.isOpenSidebar
    )
      return true;

    return false;
  };
  const buttonSize: BaseSize = functionBarDefinition.buttonSize;
</script>

<div
  class={classNames(
    "h-fit w-fit",
    "flex",
    "flex-row",
    "items-center",
    "space-x-3",
    "",
  )}
>
  {#if showThreeDotsButtonResponsive()}
    <PageWrapperContentFunctionBarButtonsThreeDots
      {buttonSize}
      buttonsDefinition={functionBarDefinition.buttonsDefinition}
      colorCategory={colorSettings.gridFunctionButton}
    />
  {:else}
    {#each functionBarDefinition.buttonsDefinition as buttonGroup, buttonDefinitionIndex}
      <div
        class={classNames("flex", "flex-row", "items-center", "space-x-3", "")}
      >
        {#each buttonGroup as { iconName, tooltipText, onClickEventFunction, tooltipXPosition, tooltipYPosition }}
          <BaseButtonIcon
            size={buttonSize}
            {iconName}
            {tooltipText}
            {tooltipXPosition}
            {tooltipYPosition}
            colorCategoryBg={colorSettings.gridFunctionButton}
            colorCategoryFront={colorSettings.gridFunctionButton}
            on:click={onClickEventFunction}
          />
        {/each}
      </div>
      <BaseDividerVertical
        size={buttonSize}
        colorCategory={colorSettings.gridFunctionButton}
        hidden={buttonDefinitionIndex >=
          functionBarDefinition.buttonsDefinition.length - 1}
      />
    {/each}
  {/if}
</div>
