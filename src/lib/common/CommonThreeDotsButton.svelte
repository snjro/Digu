<script lang="ts" generics="ButtonGroupKey extends string">
  import type { CommonFunctionButtonDefinition } from "./CommonFunctionBar/CommonFunctionButtons.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseDividerHorizontal from "$lib/base/BaseDividerHorizontal.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import classNames from "classnames";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  type ButtonDefinitions = Record<
    ButtonGroupKey,
    CommonFunctionButtonDefinition[]
  >;

  export let buttonDefinitions: ButtonDefinitions;
  export let size: BaseSize;
  export let colorCategory: ColorCategory;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  const buttonDefinitionKeys = Object.keys(
    buttonDefinitions
  ) as ButtonGroupKey[];

  let showChildren: boolean = false;

  const toggleShowChildren = () => {
    showChildren = !showChildren;
  };
</script>

<div
  class={classNames("flex", "flex-col", "items-end", "space-y-0.5", "relative")}
>
  <BaseButtonIcon
    {size}
    iconName="dotsVertical"
    colorCategoryBg={colorCategory}
    colorCategoryFront={colorCategory}
    on:click={toggleShowChildren}
  />
  <div
    class={classNames(
      "absolute",
      "top-6",
      "z-50",
      "p-2",
      "rounded",
      "space-y-2",
      "shadow",
      "border",
      !showChildren && "hidden",
      colorDefinitions[themeColor][colorSettings.gridFunctionButton].border,
      colorDefinitions[themeColor][colorSettings.gridFunctionButton].bg
    )}
  >
    {#each buttonDefinitionKeys as buttonDefinitionKey, buttonDefinitionIndex}
      <div
        class={classNames(
          "flex",
          "flex-col",
          "items-start",
          "space-y-1",
          "w-52"
        )}
      >
        {#each buttonDefinitions[buttonDefinitionKey] as { iconName, tooltipText, onClickEventFunction }}
          <BaseButtonIcon
            {size}
            {iconName}
            label={tooltipText}
            colorCategoryBg={colorSettings.gridFunctionButton}
            colorCategoryFront={colorSettings.gridFunctionButton}
            appendClassButton={classNames("w-full", "justify-start")}
            shadowEffect={false}
            on:click={onClickEventFunction}
            on:click={toggleShowChildren}
          />
        {/each}
      </div>
      <BaseDividerHorizontal
        colorCategory={colorSettings.gridFunctionButton}
        hidden={buttonDefinitionIndex >= buttonDefinitionKeys.length - 1}
      />
    {/each}
  </div>
</div>
