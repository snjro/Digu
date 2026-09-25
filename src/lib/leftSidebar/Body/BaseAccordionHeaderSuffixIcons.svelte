<script lang="ts" module>
  export type BaseAccordionHeaderSuffixIcon = {
    name: BaseIconProps["name"];
    size: BaseSize;
  };
</script>

<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { HoverType } from "./BaseAccordionHeader.svelte";
  import { leftSidebarItemRoundedStyle } from "./BaseItem.svelte";
  import { getFrontColorCategory } from "./fontStyle";

  interface Props {
    label: string;
    height: `h-${string}`;
    bgColor: `bg-${string}` | undefined;
    isSelected: boolean;
    hoverType: HoverType;
    isOpenAccordion?: boolean;
    suffixIcons: BaseAccordionHeaderSuffixIcon[];
    onclick?: ((event: MouseEvent) => void) | undefined;
    onmouseenter?: ((event: MouseEvent) => void) | undefined;
    onmouseleave?: ((event: MouseEvent) => void) | undefined;
    onkeydown?: ((event: KeyboardEvent) => void) | undefined;
  }

  let {
    label,
    height,
    bgColor,
    isSelected,
    hoverType,
    isOpenAccordion = true,
    suffixIcons,
    onclick = undefined,
    onmouseenter = undefined,
    onmouseleave = undefined,
    onkeydown = undefined,
  }: Props = $props();

  let frontColorCategory: ColorCategory = $derived(
    getFrontColorCategory(isSelected),
  );

  let shevronUnderlineStyle: string = $derived(
    hoverType === "onSpace"
      ? classNames("border-b", colorClasses["interactive"].border)
      : "",
  );
</script>

<div
  role="button"
  tabindex="0"
  aria-label={`Toggle ${label}`}
  aria-expanded={isOpenAccordion}
  class={classNames(
    "grow",
    "flex",
    "flex-row",
    "items-center",
    bgColor,
    height,
    "justify-end",
    "pr-1",
    "cursor-pointer",
    leftSidebarItemRoundedStyle,
    "",
  )}
  {onclick}
  {onmouseenter}
  {onmouseleave}
  {onkeydown}
>
  {#if suffixIcons.length > 0}
    <div class={classNames("grow", "justify-end", "flex", "flex-row")}>
      {#each suffixIcons as suffixIcon}
        <BaseIcon
          isHover={hoverType !== undefined}
          name={suffixIcon.name}
          size={suffixIcon.size}
          colorCategory={frontColorCategory}
        />
      {/each}
    </div>
  {/if}

  <BaseIcon
    name={isOpenAccordion ? "chevronDown" : "chevronRight"}
    size={sizeSettings.leftSidebarChevronIcon}
    isHoverControledByParent
    isHover={hoverType !== undefined}
    colorCategory={frontColorCategory}
    appendClass={shevronUnderlineStyle}
  />
</div>
