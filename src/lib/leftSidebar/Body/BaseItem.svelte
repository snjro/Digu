<script lang="ts" module>
  export const leftSidebarItemRoundedStyle: `rounded-${string}` =
    "rounded-r-md";
</script>

<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
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
  import { storeNoDbOpenLeftSidebarAccordion } from "@stores/storeNoDb";
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

  // The link moves the page. A click to open a new tab keeps the sidebar.
  async function onClick(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0)
      return;
    await toggleLeftSideBarWithCondition();
  }

  let isSelected: boolean = $derived(
    isSelectedDirectory(hrefWithoutUrlHash, page.url.pathname),
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

  let bgColor = $derived(
    (isSelected || hoverType !== undefined) &&
      colorClasses[colorSettings.leftSidebarBodyBg].bgEmphasis,
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
