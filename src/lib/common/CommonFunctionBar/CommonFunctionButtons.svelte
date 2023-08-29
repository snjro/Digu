<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    breakPointWidths,
    type BreakPointWidthValue,
  } from "$lib/appearanceConfig/size/sizeDefinitions";
  import BaseButtonIcon, {
    type SimplifiedButtonDefinition,
  } from "$lib/base/BaseButtonIcon.svelte";
  import BaseDividerVertical from "$lib/base/BaseDividerVertical.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import classNames from "classnames";
  import CommonThreeDotsButton from "../CommonThreeDotsButton.svelte";

  export let buttonDefinitions: Array<SimplifiedButtonDefinition[]>;
  export let isOpenSidebar: boolean = false;
  export let responsive: boolean = true;
  export let buttonSize: BaseSize;
  export let listSize: BaseSize = buttonSize;
  export let breakPointWidthForOpendSidebar: BreakPointWidthValue;

  let showThreeDotsButton: () => boolean;
  $: showThreeDotsButton = (): boolean => {
    if (!responsive) return false;
    if ($storeNoDbCurrentWidth <= breakPointWidths.sm) return true;
    if (
      $storeNoDbCurrentWidth <= breakPointWidthForOpendSidebar &&
      isOpenSidebar
    )
      return true;

    return false;
  };
</script>

<div
  class={classNames(
    "h-fit w-fit",
    "flex",
    "flex-row",
    "items-center",
    "space-x-3",
    ""
  )}
>
  {#if showThreeDotsButton()}
    <CommonThreeDotsButton
      {buttonSize}
      {listSize}
      {buttonDefinitions}
      colorCategory={colorSettings.gridFunctionButton}
    />
  {:else}
    {#each buttonDefinitions as buttonGroup, buttonDefinitionIndex}
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
        hidden={buttonDefinitionIndex >= buttonDefinitions.length - 1}
      />
    {/each}
  {/if}
</div>
