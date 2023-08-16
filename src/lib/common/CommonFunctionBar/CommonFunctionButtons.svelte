<script lang="ts" generics="ButtonGroupKey extends string">
  import BaseDividerVertical from "$lib/base/BaseDividerVertical.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseButtonIcon, {
    type SimplifiedButtonDefinition,
  } from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { breakPointWidths, type BreakPointWidthValue } from "@utils/utilsDom";
  import CommonThreeDotsButton from "../CommonThreeDotsButton.svelte";

  type ButtonDefinitions = Record<ButtonGroupKey, SimplifiedButtonDefinition[]>;
  export let buttonDefinitions: ButtonDefinitions;
  export let isOpenSidebar: boolean = false;
  export let responsive: boolean = true;
  export let buttonSize: BaseSize;
  export let listSize: BaseSize = buttonSize;
  export let breakPointWidthForOpendSidebar: BreakPointWidthValue;

  const buttonDefinitionKeys = Object.keys(
    buttonDefinitions
  ) as ButtonGroupKey[];

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
    {#each buttonDefinitionKeys as buttonDefinitionKey, buttonDefinitionIndex}
      <div
        class={classNames("flex", "flex-row", "items-center", "space-x-3", "")}
      >
        {#each buttonDefinitions[buttonDefinitionKey] as { iconName, tooltipText, onClickEventFunction, tooltipXPosition, tooltipYPosition }}
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
        hidden={buttonDefinitionIndex >= buttonDefinitionKeys.length - 1}
      />
    {/each}
  {/if}
</div>
