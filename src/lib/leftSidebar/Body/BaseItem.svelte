<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import BaseButton from "$lib/base/BaseButton.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import {
    isHrefParentOfPathname,
    toggleLeftSideBarWithCondition,
  } from "../functions";
  import { getFrontColorCategory, getFrontWeight } from "./fontStyle";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";
  import { setChildElementInScroll } from "./scrollController";
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { createEventDispatcher } from "svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let label: string;
  export let hrefWithoutUrlHash: string;
  export let urlHash: string | undefined = undefined;
  export let size: BaseSize;
  export let iconName: BaseIconProps["name"] | undefined = undefined;
  export let openNewTab: boolean = false;
  export let isConsideredAsParentDirectory: boolean = false;
  export let isHoverControledByParent: boolean = false;
  export let isHover: boolean = false;
  export let isTopLevelItem: boolean = false;

  const hrefWithUrlHash: string = urlHash
    ? `${hrefWithoutUrlHash}#${urlHash}`
    : hrefWithoutUrlHash;

  let thisElement: HTMLDivElement;
  // let isHover = false;
  const dispatch = createEventDispatcher();
  function onMouseEnter(event: CustomEvent) {
    if (!isHoverControledByParent) isHover = true;
    dispatch("mouseenter", event.detail);
  }
  function onMouseLeave(event: CustomEvent) {
    if (!isHoverControledByParent) isHover = false;
    dispatch("mouseleave", event.detail);
  }
  async function onClick() {
    await toggleLeftSideBarWithCondition();
  }
  $: baseSidebarItemStyle = () =>
    classNames("w-full", getFrontWeight(isSelected(), isHover));
  $: isSelected = (): boolean => {
    return hrefWithoutUrlHash === $page.url.pathname;
  };
  $: isParentDirectory = (): boolean => {
    return (
      isHrefParentOfPathname(hrefWithoutUrlHash, $page.url.pathname) &&
      isConsideredAsParentDirectory
    );
  };

  $: {
    setChildElementInScroll(
      browser,
      isSelected(),
      document.getElementById("leftSidebarBody"),
      thisElement,
      document.getElementById("leftSidebarHeader"),
      $storeNoDbOpenLeftSidebarAccordion
    );
  }
  $: frontColorCategory = (): ColorCategory => {
    return getFrontColorCategory(isSelected() || isParentDirectory());
  };
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  $: bgColor =
    (isSelected() || isHover) &&
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis;
  const height: { [key in BaseSize]: `h-${string}` } = {
    xs: "h-5",
    sm: "h-6",
    md: "h-7",
    lg: "h-8",
    xl: "h-8",
    "2xl": "h-9",
    "3xl": "h-10",
    "4xl": "h-11",
    "5xl": "h-14",
  };
</script>

<div
  bind:this={thisElement}
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    height[size],
    "rounded"
  )}
>
  <BaseItemIndicator
    isSelected={isSelected() || isParentDirectory()}
    {isHover}
    {isTopLevelItem}
    invisible={size === sizeSettings.leftSidebarTreeTop}
  />
  <div
    bind:this={thisElement}
    class={classNames(
      "flex",
      "flex-row",
      "items-center",
      "w-full",
      "pl-1",
      bgColor,
      baseTextHeight[size],
      // "h-full",
      isTopLevelItem || isConsideredAsParentDirectory ? "rounded" : "rounded-l"
    )}
  >
    {#if iconName}
      <BaseButtonIcon
        {iconName}
        {label}
        href={hrefWithUrlHash}
        {size}
        justify="start"
        colorCategoryFront={frontColorCategory()}
        colorCategoryBg={undefined}
        appendClassButton={classNames(baseSidebarItemStyle())}
        {openNewTab}
        shadowEffect={false}
        popupEffect={false}
        hoverEffect
        noPadding
        {isHoverControledByParent}
        {isHover}
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
        colorCategoryFront={frontColorCategory()}
        colorCategoryBg={undefined}
        appendClass={classNames(baseSidebarItemStyle())}
        {openNewTab}
        popupEffect={false}
        shadowEffect={false}
        noPadding
        {isHoverControledByParent}
        {isHover}
        on:mouseenter={onMouseEnter}
        on:mouseleave={onMouseLeave}
        on:click={onClick}
      />
    {/if}
  </div>
</div>
