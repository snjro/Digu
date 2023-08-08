<script lang="ts" context="module">
  export type LayerLevel = 0 | 1 | 2 | 3 | 4;
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import BaseButton, {
    type BaseButtonProps,
  } from "$lib/base/BaseButton.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import { toggleLeftSideBarWithCondition } from "../functions";
  import { getFrontColorCategory } from "./fontStyle";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";
  import { setChildElementInScroll } from "./scrollController";
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import {
    type BaseSize,
    buttonHeight,
    leftSideBarItemHeight,
  } from "$lib/base/baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { goto } from "$app/navigation";

  export let label: string;
  export let hrefWithoutUrlHash: string;
  export let urlHash: string | undefined = undefined;
  export let size: BaseSize;
  export let iconName: BaseIconProps["name"] | undefined = undefined;
  export let openNewTab: boolean = false;
  export let isHoverControledByParent: boolean = false;
  export let isHover: boolean = false;
  export let isTopLevelItem: boolean = false;
  export let hasChildren = true;
  export let layerLevel: LayerLevel;

  const hrefWithUrlHash: string = urlHash
    ? `${hrefWithoutUrlHash}#${urlHash}`
    : hrefWithoutUrlHash;

  let thisElement: HTMLButtonElement;

  function onMouseEnter() {
    if (!isHoverControledByParent) isHover = true;
  }
  function onMouseLeave() {
    if (!isHoverControledByParent) isHover = false;
  }
  async function onClick() {
    await goto(hrefWithUrlHash);
    await toggleLeftSideBarWithCondition();
  }
  let isSelected: boolean;
  $: isSelected = hrefWithoutUrlHash === $page.url.pathname;

  $: {
    setChildElementInScroll(
      browser,
      isSelected,
      document.getElementById("leftSidebarBody"),
      thisElement,
      document.getElementById("leftSidebarHeader"),
      $storeNoDbOpenLeftSidebarAccordion
    );
  }
  let frontColorCategory: ColorCategory;
  $: frontColorCategory = getFrontColorCategory(isSelected);

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  $: bgColor =
    (isSelected || isHover) &&
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis;

  const widthForFrame = (): string => {
    if (hasChildren) {
      return "w-fit";
    } else {
      switch (layerLevel) {
        case 0:
          return "item-width-0";
        case 1:
          return "item-width-1";
        case 2:
          return "item-width-2";
        case 3:
          return "item-width-3";
        default:
          return "item-width-4";
      }
    }
  };
  const widthForButton = (): `w-${string}` => {
    if (hasChildren) {
      return "w-fit";
    } else {
      return "w-full";
    }
  };
  let selectedFontWeight: BaseButtonProps["designatedFontWeight"];
  $: selectedFontWeight = isSelected ? "font-bold" : undefined;
</script>

<button
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    buttonHeight[size],
    widthForFrame(),
    ""
  )}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:click={onClick}
>
  <BaseItemIndicator
    {isSelected}
    {isHover}
    {isTopLevelItem}
    invisible={size === sizeSettings.leftSidebarTree1st}
    {layerLevel}
  />
  <button
    bind:this={thisElement}
    class={classNames(
      "flex",
      "flex-row",
      "items-center",
      widthForFrame(),
      "px-0.5",
      bgColor,
      "truncate",
      leftSideBarItemHeight[size],
      hasChildren ? "rounded-l" : "rounded"
    )}
    on:click={onClick}
  >
    {#if iconName}
      <BaseButtonIcon
        {iconName}
        {label}
        href={hrefWithUrlHash}
        {size}
        justify="start"
        colorCategoryFront={frontColorCategory}
        colorCategoryBg={undefined}
        appendClassButton={widthForButton()}
        designatedFontWeight={selectedFontWeight}
        {openNewTab}
        shadowEffect={false}
        popupEffect={false}
        hoverEffect
        noPadding
        isHoverControledByParent
        {isHover}
      />
    {:else}
      <BaseButton
        {label}
        href={hrefWithUrlHash}
        {size}
        justify="start"
        colorCategoryFront={frontColorCategory}
        colorCategoryBg={undefined}
        appendClass={widthForButton()}
        designatedFontWeight={selectedFontWeight}
        {openNewTab}
        popupEffect={false}
        shadowEffect={false}
        noPadding
        isHoverControledByParent
        {isHover}
      />
    {/if}
  </button>
</button>

<style lang="scss">
  @use "../leftsidebar.scss" as lsb;
  .item-width-0 {
    width: lsb.get-item-width(0) * 1px;
  }
  .item-width-1 {
    width: lsb.get-item-width(1) * 1px;
  }
  .item-width-2 {
    width: lsb.get-item-width(2) * 1px;
  }
  .item-width-3 {
    width: lsb.get-item-width(3) * 1px;
  }
  .item-width-4 {
    width: lsb.get-item-width(4) * 1px;
  }
</style>
