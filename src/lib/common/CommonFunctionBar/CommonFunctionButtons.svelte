<script lang="ts" context="module">
  export type CommonFunctionButtonDefinition = {
    iconName: BaseIconProps["name"];
    tooltipText: BaseTooltipProps["text"];
    onClickEventFunction: () => void | Promise<void>;
    tooltipXPosition: BaseTooltipProps["xPosition"];
    tooltipYPosition: BaseTooltipProps["yPosition"];
  };
</script>

<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";

  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { BaseTooltipProps } from "$lib/base/BaseTooltip.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import classNames from "classnames";

  type ButtonGroupKey = $$Generic<string>;
  type ButtonDefinitions = Record<
    ButtonGroupKey,
    CommonFunctionButtonDefinition[]
  >;
  export let buttonDefinitions: ButtonDefinitions;
  const buttonSize: BaseSize = sizeSettings.gridFunctionButton;

  const buttonDefinitionKeys = Object.keys(
    buttonDefinitions
  ) as ButtonGroupKey[];
</script>

<div
  class={classNames(
    "h-fit w-fit",
    "flex",
    "flex-row",
    "items-center",
    "space-x-5"
  )}
>
  {#each buttonDefinitionKeys as buttonDefinitionKey}
    <div class={classNames("flex", "flex-row", "items-center", "space-x-2")}>
      {#each buttonDefinitions[buttonDefinitionKey] as { iconName, tooltipText, onClickEventFunction, tooltipXPosition, tooltipYPosition }}
        <BaseButtonIcon
          size={buttonSize}
          {iconName}
          {tooltipText}
          {tooltipXPosition}
          {tooltipYPosition}
          appendClassButton={"p-0"}
          colorCategoryBg={colorSettings.gridFunctionButton}
          colorCategoryFront={colorSettings.gridFunctionButton}
          on:click={onClickEventFunction}
        />
      {/each}
    </div>
  {/each}
</div>
