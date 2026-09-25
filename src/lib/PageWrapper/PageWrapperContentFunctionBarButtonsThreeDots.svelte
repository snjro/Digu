<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import type { PageWrapperContentFunctionBarButtonsDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { zIndex } from "$lib/appearanceConfig/zIndex";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseDividerHorizontal from "$lib/base/BaseDividerHorizontal.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";

  interface Props {
    buttonsDefinition: PageWrapperContentFunctionBarButtonsDefinition;
    buttonSize: BaseSize;
    colorCategory: ColorCategory;
  }

  let { buttonsDefinition, buttonSize, colorCategory }: Props = $props();

  let showChildren: boolean = $state(false);

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

  let thisElement: HTMLElement | undefined = $state();

  //hide children when `Esc` is pressed.
  const onKeydown = (event: KeyboardEvent): void => {
    if (showChildren && event.key === "Escape") {
      toggleShowChildren();
    }
  };
  //hide children when clicked outside of this component
  const onClick = (event: MouseEvent): void => {
    if (
      showChildren &&
      thisElement &&
      thisElement.contains(event.target as Node) === false
    ) {
      toggleShowChildren();
    }
  };
</script>

<svelte:document onkeydown={onKeydown} onclick={onClick} />

<div
  bind:this={thisElement}
  class={classNames("flex", "flex-col", "items-end", "relative")}
>
  <BaseButtonIcon
    size={buttonSize}
    iconName="dotsVertical"
    ariaLabel="More"
    colorCategoryBg={colorCategory}
    colorCategoryFront={colorCategory}
    onclick={toggleShowChildren}
  />
  <div
    class={classNames(
      "absolute",
      top(),
      "mt-0.5",
      zIndex.threeDotsMenu,
      "p-2",
      "rounded-sm",
      "space-y-2",
      "shadow-sm",
      "border",
      !showChildren && "hidden",
      colorClasses[colorSettings.gridFunctionButton].border,
      colorClasses[colorSettings.gridFunctionButton].bg,
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
            onclick={() => {
              onClickEventFunction();
              toggleShowChildren();
            }}
          />
        {/each}
      </div>
      {#if buttonDefinitionIndex < buttonsDefinition.length - 1}
        <BaseDividerHorizontal
          colorCategory={colorSettings.gridFunctionButton}
        />
      {/if}
    {/each}
  </div>
</div>
