<script lang="ts" context="module">
  export type HoverType = "onItem" | "onSpace" | undefined;
</script>

<script lang="ts">
  import { page } from "$app/stores";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
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
  import { onMount } from "svelte";
  import { isHrefParentOfPathname } from "../functions";
  import BaseAccordionHeaderSuffixIcons, {
    type BaseAccordionHeaderSuffixIcon,
  } from "./BaseAccordionHeaderSuffixIcons.svelte";
  import BaseItem from "./BaseItem.svelte";

  export let label: string;
  export let hrefWithoutUrlHash: string;
  export let urlHash: string | undefined;
  export let size: BaseSize;
  export let iconName: BaseIconProps["name"] | undefined;
  export let isTopLevelItem: boolean;
  export let suffixIcons: BaseAccordionHeaderSuffixIcon[];
  export let isOpenAccordion: boolean;

  let hoverType: HoverType = undefined;

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
  function onMouseEnter(): void {
    hoverType = "onSpace";
  }
  function onMouseLeave(): void {
    hoverType = undefined;
  }
  function flipAccordion(): void {
    isOpenAccordion = !isOpenAccordion;
  }
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      flipAccordion();
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

  $: bgColor =
    isSelected() || hoverType !== undefined
      ? colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis
      : undefined;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;
</script>

<div
  class={classNames(
    "flex-initial",
    "flex",
    "flex-row",
    "items-center",
    "w-full max-w-full",
    buttonHeight[size],
    "",
  )}
>
  <BaseItem
    {label}
    {hrefWithoutUrlHash}
    {urlHash}
    {iconName}
    {size}
    bind:hoverType
    isHoverControledByParent={false}
    {isTopLevelItem}
    noGrow
  />
  <BaseAccordionHeaderSuffixIcons
    {hoverType}
    height={leftSideBarItemHeight[size]}
    isSelected={isSelected()}
    {bgColor}
    {isOpenAccordion}
    {suffixIcons}
    on:click={flipAccordion}
    on:mouseenter={onMouseEnter}
    on:mouseleave={onMouseLeave}
    on:keydown={onKeyDown}
  />
</div>
