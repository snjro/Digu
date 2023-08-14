<script lang="ts" context="module">
  export type CommonFunctionButtonDefinition = {
    iconName: BaseIconProps["name"];
    tooltipText: BaseTooltipProps["text"];
    onClickEventFunction: () => void | Promise<void>;
    tooltipXPosition: BaseTooltipProps["xPosition"];
    tooltipYPosition: BaseTooltipProps["yPosition"];
  };
</script>

<script lang="ts" generics="ButtonGroupKey extends string">
  import { storeUserSettings } from "@stores/storeUserSettings";

  import BaseDividerVertical from "$lib/base/BaseDividerVertical.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { BaseTooltipProps } from "$lib/base/BaseTooltip.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import classNames from "classnames";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { breakPointWidths } from "@utils/utilsDom";
  import CommonThreeDotsButton from "../CommonThreeDotsButton.svelte";

  type ButtonDefinitions = Record<
    ButtonGroupKey,
    CommonFunctionButtonDefinition[]
  >;
  export let buttonDefinitions: ButtonDefinitions;
  export let isFullScreen: boolean;
  export let responsive: boolean = true;

  const buttonSize: BaseSize = sizeSettings.gridFunctionButton;

  const buttonDefinitionKeys = Object.keys(
    buttonDefinitions
  ) as ButtonGroupKey[];

  $: showThreeDotsButton =
    responsive &&
    ($storeNoDbCurrentWidth <= breakPointWidths.sm ||
      ($storeNoDbCurrentWidth <= breakPointWidths.lg &&
        $storeUserSettings.isOpenSidebar &&
        !isFullScreen));
</script>

<div
  class={classNames(
    "h-fit w-fit",
    "flex",
    "flex-row",
    "items-center",
    "space-x-2",
    ""
  )}
>
  {#if showThreeDotsButton}
    <CommonThreeDotsButton
      size={buttonSize}
      {buttonDefinitions}
      colorCategory={colorSettings.gridFunctionButton}
    />
  {:else}
    {#each buttonDefinitionKeys as buttonDefinitionKey, buttonDefinitionIndex}
      <div
        class={classNames(
          "flex",
          "flex-row",
          "items-center",
          "space-x-1.5",
          ""
        )}
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
