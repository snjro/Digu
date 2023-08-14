<script lang="ts" generics="ButtonGroupKey extends string">
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import BaseDividerHorizontal from "$lib/base/BaseDividerHorizontal.svelte";
  import BaseButtonIcon, {
    type SimplifiedButtonDefinition,
  } from "$lib/base/BaseButtonIcon.svelte";
  import classNames from "classnames";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  type ButtonDefinitions = Record<ButtonGroupKey, SimplifiedButtonDefinition[]>;

  export let buttonDefinitions: ButtonDefinitions;
  export let buttonSize: BaseSize;
  export let listSize: BaseSize;
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
  const top = (): `top-${number}` => {
    switch (buttonSize) {
      case "xs":
        return "top-4";
      case "sm":
        return "top-5";
      case "md":
        return "top-6";
      case "lg":
        return "top-7";
      case "xl":
        return "top-8";
      case "2xl":
        return "top-9";
      case "3xl":
        return "top-10";
      case "4xl":
        return "top-11";
      default:
        return "top-12";
    }
  };
</script>

<div
  class={classNames("flex", "flex-col", "items-end", "space-y-0.5", "relative")}
>
  <BaseButtonIcon
    size={buttonSize}
    iconName="dotsVertical"
    colorCategoryBg={colorCategory}
    colorCategoryFront={colorCategory}
    on:click={toggleShowChildren}
  />
  <div
    class={classNames(
      "absolute",
      top(),
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
          "w-56"
        )}
      >
        {#each buttonDefinitions[buttonDefinitionKey] as { iconName, tooltipText, onClickEventFunction }}
          <BaseButtonIcon
            size={listSize}
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
