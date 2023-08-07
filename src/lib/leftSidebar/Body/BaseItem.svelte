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

  const hrefWithUrlHash: string = urlHash
    ? `${hrefWithoutUrlHash}#${urlHash}`
    : hrefWithoutUrlHash;

  let thisElement: HTMLDivElement;

  function onMouseEnter() {
    if (!isHoverControledByParent) isHover = true;
  }
  function onMouseLeave() {
    if (!isHoverControledByParent) isHover = false;
  }
  async function onClick() {
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

  let width = (): `w-${string}` => {
    if (hasChildren) {
      return "w-fit";
    } else {
      if (isTopLevelItem) {
        return "w-full";
      } else {
        return "w-[256px]";
      }
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
    width()
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
  />
  <div
    bind:this={thisElement}
    class={classNames(
      "flex",
      "flex-row",
      "items-center",
      width(),
      "px-0.5",
      bgColor,
      "truncate",
      leftSideBarItemHeight[size],
      hasChildren ? "rounded-l" : "rounded"
    )}
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
        appendClassButton={width()}
        designatedFontWeight={selectedFontWeight}
        {openNewTab}
        shadowEffect={false}
        popupEffect={false}
        hoverEffect
        noPadding
        {isHoverControledByParent}
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
        appendClass={width()}
        designatedFontWeight={selectedFontWeight}
        {openNewTab}
        popupEffect={false}
        shadowEffect={false}
        noPadding
        {isHoverControledByParent}
        {isHover}
      />
    {/if}
  </div>
</button>
