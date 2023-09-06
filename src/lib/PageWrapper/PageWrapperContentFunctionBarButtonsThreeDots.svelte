<script lang="ts">
  import type { PageWrapperContentFunctionBarButtonsDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseDividerHorizontal from "$lib/base/BaseDividerHorizontal.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";

  export let buttonsDefinition: PageWrapperContentFunctionBarButtonsDefinition;
  export let buttonSize: BaseSize;
  export let colorCategory: ColorCategory;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

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

  let thisElement: HTMLElement;

  //hide children when `Esc` is pressed.
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (showChildren && event.key === "Escape") {
      toggleShowChildren();
    }
  });
  //hide children when clicked outside of this component
  document.addEventListener("click", (event: MouseEvent) => {
    if (
      showChildren &&
      thisElement &&
      thisElement.contains(event.target as Node) === false
    ) {
      toggleShowChildren();
    }
  });
</script>

<div
  bind:this={thisElement}
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
      zIndex.threeDotsMenu,
      "p-2",
      "rounded",
      "space-y-2",
      "shadow",
      "border",
      !showChildren && "hidden",
      colorDefinitions[themeColor][colorSettings.gridFunctionButton].border,
      colorDefinitions[themeColor][colorSettings.gridFunctionButton].bg,
    )}
  >
    {#each buttonsDefinition as buttonGroup, buttonDefinitionIndex}
      <div
        class={classNames(
          "flex",
          "flex-col",
          "items-start",
          "space-y-1",
          "w-56",
        )}
      >
        {#each buttonGroup as { iconName, tooltipText, onClickEventFunction }}
          <BaseButtonIcon
            size={sizeSettings.threeDotsList}
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
        hidden={buttonDefinitionIndex >= buttonsDefinition.length - 1}
      />
    {/each}
  </div>
</div>
