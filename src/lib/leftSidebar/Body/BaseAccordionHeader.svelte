<script lang="ts">
  // import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import {
    type BaseSize,
    buttonHeight,
    leftSideBarItemHeight,
  } from "$lib/base/baseSizes";
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
  import classNames from "classnames";
  import { onMount } from "svelte";
  import {
    isHrefParentOfPathname,
    toggleLeftSideBarWithCondition,
  } from "../functions";
  import { setChildElementInScroll } from "./scrollController";
  import { browser } from "$app/environment";
  import BaseItem, { type LayerLevel } from "./BaseItem.svelte";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import BaseAccordionHeaderSuffixIcons, {
    type BaseAccordionHeaderSuffixIcon,
  } from "./BaseAccordionHeaderSuffixIcons.svelte";
  import BaseAccordionHeaderSpacer from "./BaseAccordionHeaderSpacer.svelte";

  export let label: string;
  export let hrefWithoutUrlHash: string;
  export let urlHash: string | undefined;
  export let size: BaseSize;
  export let iconName: BaseIconProps["name"] | undefined;
  export let isTopLevelItem: boolean;
  export let suffixIcons: BaseAccordionHeaderSuffixIcon[];
  export let isOpenAccordion: boolean;
  export let layerLevel: LayerLevel;

  let isHover = false;
  let thisElement: HTMLButtonElement;

  $: {
    switch ($storeNoDbOpenLeftSidebarAccordion) {
      case "openAll":
        isOpenAccordion = true;
        break;
      case "closeAll":
        isOpenAccordion = false;
        break;
      case "openCurrentOnly":
        openCurrentDirectory();
        break;
      default:
        break;
    }
  }
  function onMouseEnter() {
    isHover = true;
  }
  function onMouseLeave() {
    isHover = false;
  }
  function flipAccordion(e: Event) {
    const htmlElement: HTMLElement = e.target as HTMLElement;
    if (htmlElement.tagName === "LABEL") {
      toggleLeftSideBarWithCondition();
      if (!isOpenAccordion) {
        isOpenAccordion = isParentDirectory();
      }
    } else {
      isOpenAccordion = !isOpenAccordion;
    }
  }
  function openCurrentDirectory(): void {
    isOpenAccordion = !isSelected() && isParentDirectory();
  }
  onMount(() => {
    // open an accordion when a page is opened by using URL directly
    openCurrentDirectory();
  });

  $: isSelected = (): boolean => {
    return hrefWithoutUrlHash === $page.url.pathname;
  };
  $: isParentDirectory = (): boolean => {
    return isHrefParentOfPathname(hrefWithoutUrlHash, $page.url.pathname);
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
  $: bgColor =
    isSelected() || isHover
      ? colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis
      : undefined;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<button
  bind:this={thisElement}
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    "w-full",
    buttonHeight[size],
    "cursor-default",
    ""
  )}
  on:keypress
  on:click={flipAccordion}
  on:mouseenter={onMouseEnter}
  on:focus={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:blur={onMouseLeave}
>
  <BaseItem
    {label}
    {hrefWithoutUrlHash}
    {urlHash}
    {iconName}
    {size}
    {isHover}
    isHoverControledByParent
    {isTopLevelItem}
    {layerLevel}
  />
  <BaseAccordionHeaderSpacer {bgColor} height={leftSideBarItemHeight[size]} />
  <BaseAccordionHeaderSuffixIcons
    {isHover}
    height={leftSideBarItemHeight[size]}
    isSelected={isSelected()}
    {bgColor}
    {isOpenAccordion}
    {suffixIcons}
  />
</button>
