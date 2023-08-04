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
  import { toggleLeftSideBarWithCondition } from "../functions";
  import { getFrontColorCategory, getFrontWeight } from "./fontStyle";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";
  import { setChildElementInScroll } from "./scrollController";
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import { createEventDispatcher } from "svelte";
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
  let frontColorCategory: ColorCategory;
  $: frontColorCategory = getFrontColorCategory(isSelected());

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  $: bgColor =
    (isSelected() || isHover) &&
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
</script>

<div
  bind:this={thisElement}
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    buttonHeight[size],
    width()
  )}
>
  <BaseItemIndicator
    isSelected={isSelected()}
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
      hasChildren ? "w-fit" : "w-full",
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
        colorCategoryFront={frontColorCategory}
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
