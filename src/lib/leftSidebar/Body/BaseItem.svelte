<script lang="ts" context="module">
  export const leftSidebarItemRoundedStyle: `rounded-${string}` =
    "rounded-r-md";
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButton, {
    type BaseButtonProps,
  } from "$lib/base/BaseButton.svelte";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import {
    buttonHeight,
    leftSideBarItemHeight,
    type BaseSize,
  } from "$lib/base/baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import { toggleLeftSideBarWithCondition } from "../functions";
  import type { HoverType } from "./BaseAccordionHeader.svelte";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";
  import { getFrontColorCategory } from "./fontStyle";
  import { setChildElementInScroll } from "./scrollController";

  export let label: string;
  export let hrefWithoutUrlHash: string;
  export let urlHash: string | undefined = undefined;
  export let size: BaseSize;
  export let iconName: BaseIconProps["name"] | undefined = undefined;
  export let openNewTab: boolean = false;
  export let isHoverControledByParent: boolean = false;
  export let hoverType: HoverType = undefined;
  export let isTopLevelItem: boolean = false;
  export let hasChildren = true;
  export let noGrow: boolean = false;

  const hrefWithUrlHash: string = urlHash
    ? `${hrefWithoutUrlHash}#${urlHash}`
    : hrefWithoutUrlHash;

  let thisElement: HTMLDivElement;

  async function onClick() {
    await Promise.all([
      // This `goto` triggers a page reloading.
      // To avoid the reloading, add `preventDefault` as an event modifier to `on:click`
      goto(hrefWithUrlHash),
      toggleLeftSideBarWithCondition(),
    ]);
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
    (isSelected || hoverType !== undefined) &&
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis;

  const widthForButton: `w-${string}` = hasChildren ? "w-fit" : "w-full";

  let selectedFontWeight: BaseButtonProps["designatedFontWeight"];
  $: selectedFontWeight = isSelected ? "font-bold" : undefined;

  const onMouseEnter = () => {
    if (!isHoverControledByParent) hoverType = "onItem";
  };
  const onMouseLeave = () => {
    if (!isHoverControledByParent) hoverType = undefined;
  };
  let underlineLabel: boolean;
  $: underlineLabel = !isSelected && hoverType === "onItem";
</script>

<div
  bind:this={thisElement}
  class={classNames(
    noGrow ? "flex-initial" : "flex-auto",
    "flex",
    "flex-row",
    "items-center",
    buttonHeight[size],
    "max-w-full",
    ""
  )}
>
  <BaseItemIndicator
    {isSelected}
    isHover={hoverType !== undefined}
    {isTopLevelItem}
    invisible={size === sizeSettings.leftSidebarTree1st}
  />
  <div
    class={classNames(
      "flex-auto",
      "max-w-full min-w-0",
      "flex",
      "flex-row",
      "text-left",
      "items-center",
      "px-0.5",
      bgColor,
      "truncate",
      leftSideBarItemHeight[size],
      !hasChildren && leftSidebarItemRoundedStyle
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
        appendClassButton={widthForButton}
        designatedFontWeight={selectedFontWeight}
        {openNewTab}
        shadowEffect={false}
        popupEffect={false}
        hoverEffect
        noPadding
        isHoverControledByParent
        isHover={hoverType !== undefined}
        rounded={false}
        {underlineLabel}
        on:mouseenter={onMouseEnter}
        on:mouseleave={onMouseLeave}
        on:click={onClick}
      />
    {:else}
      <BaseButton
        {label}
        href={hrefWithUrlHash}
        {size}
        justify="start"
        colorCategoryFront={frontColorCategory}
        colorCategoryBg={undefined}
        appendClass={widthForButton}
        designatedFontWeight={selectedFontWeight}
        {openNewTab}
        popupEffect={false}
        shadowEffect={false}
        noPadding
        isHoverControledByParent
        isHover={hoverType !== undefined}
        rounded={false}
        {underlineLabel}
        on:mouseenter={onMouseEnter}
        on:mouseleave={onMouseLeave}
        on:click={onClick}
      />
    {/if}
  </div>
</div>
