<script lang="ts" module>
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
  import {
    isSelectedDirectory,
    toggleLeftSideBarWithCondition,
  } from "../functions";
  import type { HoverType } from "./BaseAccordionHeader.svelte";
  import BaseItemIndicator from "./BaseItemIndicator.svelte";
  import { getFrontColorCategory } from "./fontStyle";
  import { setChildElementInScroll } from "./scrollController";

  interface Props {
    label: string;
    hrefWithoutUrlHash: string;
    urlHash?: string | undefined;
    size: BaseSize;
    iconName?: BaseIconProps["name"] | undefined;
    openNewTab?: boolean;
    isHoverControledByParent?: boolean;
    hoverType?: HoverType;
    isTopLevelItem?: boolean;
    hasChildren?: boolean;
    noGrow?: boolean;
  }

  let {
    label,
    hrefWithoutUrlHash,
    urlHash = undefined,
    size,
    iconName = undefined,
    openNewTab = false,
    isHoverControledByParent = false,
    hoverType = $bindable(undefined),
    isTopLevelItem = false,
    hasChildren = true,
    noGrow = false,
  }: Props = $props();

  let hrefWithUrlHash: string = $derived(
    urlHash ? `${hrefWithoutUrlHash}#${urlHash}` : hrefWithoutUrlHash,
  );

  let thisElement: HTMLDivElement | undefined = $state();

  async function onClick() {
    await Promise.all([
      // This `goto` triggers a page reloading.
      // To avoid the reloading, add `preventDefault` as an event modifier to `on:click`
      goto(hrefWithUrlHash),
      toggleLeftSideBarWithCondition(),
    ]);
  }

  let isSelected: boolean = $derived(
    isSelectedDirectory(hrefWithoutUrlHash, $page.url.pathname),
  );

  $effect.pre(() => {
    setChildElementInScroll(
      browser,
      isSelected,
      document.getElementById("leftSidebarBody"),
      thisElement ?? null,
      document.getElementById("leftSidebarHeader"),
      $storeNoDbOpenLeftSidebarAccordion,
    );
  });
  let frontColorCategory: ColorCategory = $derived(
    getFrontColorCategory(isSelected),
  );

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let bgColor = $derived(
    (isSelected || hoverType !== undefined) &&
      colorDefinitions[themeColor][colorSettings.leftSidebarBodyBg].bgEmphasis,
  );

  let widthForButton: `w-${string}` = $derived(
    hasChildren ? "w-fit" : "w-full",
  );

  let selectedFontWeight: BaseButtonProps["designatedFontWeight"] = $derived(
    isSelected ? "font-bold" : undefined,
  );

  const onMouseEnter = () => {
    if (!isHoverControledByParent) hoverType = "onItem";
  };
  const onMouseLeave = () => {
    if (!isHoverControledByParent) hoverType = undefined;
  };
  let underlineLabel: boolean = $derived(!isSelected && hoverType === "onItem");
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
    "",
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
      !hasChildren && leftSidebarItemRoundedStyle,
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
        onmouseenter={onMouseEnter}
        onmouseleave={onMouseLeave}
        onclick={onClick}
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
        onmouseenter={onMouseEnter}
        onmouseleave={onMouseLeave}
        onclick={onClick}
      />
    {/if}
  </div>
</div>
