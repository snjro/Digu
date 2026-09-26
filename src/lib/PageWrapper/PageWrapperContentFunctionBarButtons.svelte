<script lang="ts" module>
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

  interface Props {
    functionBarDefinition: PageWrapperContentFunctionBarDefinition;
  }

  let { functionBarDefinition }: Props = $props();

  let showThreeDotsButtonResponsive: boolean = $derived.by((): boolean => {
    if (!functionBarDefinition.showThreeDotsButton) return false;
    if ($storeNoDbCurrentWidth <= breakPointWidths.sm) return true;
    if (
      $storeNoDbCurrentWidth <=
        functionBarDefinition.breakPointWidthForOpenedSidebar &&
      $storeUserSettings.isOpenSidebar
    )
      return true;

    return false;
  });

  let buttonSize: BaseSize = $derived(functionBarDefinition.buttonSize);
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
  {#if showThreeDotsButtonResponsive}
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
            onclick={onClickEventFunction}
          />
        {/each}
      </div>
      {#if buttonDefinitionIndex < functionBarDefinition.buttonsDefinition.length - 1}
        <BaseDividerVertical
          size={buttonSize}
          colorCategory={colorSettings.gridFunctionButton}
        />
      {/if}
    {/each}
  {/if}
</div>
