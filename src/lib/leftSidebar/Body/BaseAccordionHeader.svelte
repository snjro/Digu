<script lang="ts" module>
  export type HoverType = "onItem" | "onSpace" | undefined;
</script>

<script lang="ts">
  import { page } from "$app/state";
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
  import { isHrefParentOfPathname, isSelectedDirectory } from "../functions";
  import BaseAccordionHeaderSuffixIcons, {
    type BaseAccordionHeaderSuffixIcon,
  } from "./BaseAccordionHeaderSuffixIcons.svelte";
  import BaseItem from "./BaseItem.svelte";

  interface Props {
    label: string;
    hrefWithoutUrlHash: string;
    urlHash: string | undefined;
    size: BaseSize;
    iconName: BaseIconProps["name"] | undefined;
    isTopLevelItem: boolean;
    suffixIcons: BaseAccordionHeaderSuffixIcon[];
    isOpenAccordion: boolean;
  }

  let {
    label,
    hrefWithoutUrlHash,
    urlHash,
    size,
    iconName,
    isTopLevelItem,
    suffixIcons,
    isOpenAccordion = $bindable(),
  }: Props = $props();

  let hoverType: HoverType = $state(undefined);

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
    isOpenAccordion = !isSelected && isParentDirectory;
  }
  onMount(() => {
    // open an accordion when a page is opened by using URL directly
    openCurrentDirectory();
  });

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);
  $effect.pre(() => {
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
  });
  let isSelected = $derived(
    isSelectedDirectory(hrefWithoutUrlHash, page.url.pathname),
  );
  let isParentDirectory = $derived(
    isHrefParentOfPathname(hrefWithoutUrlHash, page.url.pathname),
  );

  let bgColor = $derived(
    isSelected || hoverType !== undefined
      ? colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis
      : undefined,
  );
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
    {isSelected}
    {bgColor}
    {isOpenAccordion}
    {suffixIcons}
    onclick={flipAccordion}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    onkeydown={onKeyDown}
  />
</div>
