<script lang="ts" context="module">
  export type BaseAccordionProps = {
    size: BaseSize;
    iconName?: BaseIconProps["name"];
    bold?: boolean;
  };
</script>

<script lang="ts">
  // import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { baseTextHeight, type BaseSize } from "$lib/base/baseSizes";
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
  import classNames from "classnames";
  import { onMount } from "svelte";
  import {
    isHrefParentOfPathname,
    toggleLeftSideBarWithCondition,
  } from "../functions";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";
  import { setChildElementInScroll } from "./scrollController";
  import { browser } from "$app/environment";
  import BaseItem, {
    // leftSidebarItemHights,
    type BaseItemProps,
  } from "./BaseItem.svelte";
  import { getFrontColorCategory } from "./fontStyle";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let label: NonNullable<BaseItemProps["label"]>;
  export let href: BaseItemProps["href"];
  export let size: BaseAccordionProps["size"];
  export let iconName: BaseAccordionProps["iconName"] = undefined;
  export let isTopLevelItem: boolean = false;

  export let showVerticalLine: boolean = true;
  let isOpenAccordion = true;
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
        openCurrentOnly();
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
        isOpenAccordion = isHrefParentOfPathname(href, $page.url.pathname);
      }
    } else {
      isOpenAccordion = !isOpenAccordion;
    }
  }
  function openCurrentOnly(): void {
    isOpenAccordion =
      !isSelected() && isHrefParentOfPathname(href, $page.url.pathname);
  }
  onMount(() => {
    // open an accordion when a page is opened by using URL directly
    openCurrentOnly();
  });

  $: isSelected = (): boolean => {
    return href === $page.url.pathname;
  };
  $: isParentDirectory = (): boolean => {
    return isHrefParentOfPathname(href, $page.url.pathname);
  };

  $: chevronIconName = (): BaseIconProps["name"] => {
    return isOpenAccordion ? "chevronDown" : "chevronRight";
    // return isOpenAccordion ? "folderOpenOutline" : "folderOutline";
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
  $: {
    if (isParentDirectory() && !isOpenAccordion) {
      isOpenAccordion = true;
    }
  }
  $: bgColor =
    (isSelected() || isHover) &&
    colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
</script>

<div class={classNames("flex", "flex-col", "w-full", "h-fit", "")}>
  <button
    bind:this={thisElement}
    class={classNames(
      "flex",
      "flex-row",
      "justify-between",
      "items-center",
      "w-full",
      // leftSidebarItemHights[size],
      // baseTextHeight[size],
      "h-fit",
      // bgColor,

      "rounded"
    )}
    on:keypress
    on:click={flipAccordion}
    on:mouseenter={onMouseEnter}
    on:focus={onMouseEnter}
    on:mouseleave={onMouseLeave}
    on:blur={onMouseLeave}
  >
    <div
      class={classNames(
        "flex",
        "flex-row",
        "items-center",
        // leftSidebarItemHights[size],
        "h-fit"
      )}
    >
      <BaseItem
        {label}
        {href}
        {iconName}
        {size}
        {isHover}
        isHoverControledByParent
        {isTopLevelItem}
      />
    </div>
    <div
      class={classNames(
        "flex",
        "flex-row",
        "items-center",
        "justify-end",
        // leftSidebarItemHights[size],
        baseTextHeight[size],
        bgColor,
        "w-full",
        "rounded-r",
        ""
      )}
    >
      <slot name="baseAccordionSuffixIcons" />

      <BaseIcon
        name={chevronIconName()}
        size={sizeSettings.leftSidebarTreeTop}
        isHoverControledByParent
        {isHover}
        colorCategory={getFrontColorCategory(isSelected())}
      />
    </div>
  </button>

  <div
    class={classNames(
      "flex",
      "flex-row",
      "w-full",
      "h-fit",
      !isOpenAccordion && "hidden"
    )}
  >
    {#if showVerticalLine}
      <BaseItemIndicator
        isSelected={false}
        isHover={false}
        isUpdated={false}
        invisible={false}
        isTopLevelItem={false}
      />
    {/if}
    <div class={classNames("flex", "flex-col", "w-full", "h-full")}>
      <slot name="baseAccordionChildren" />
    </div>
  </div>
</div>
