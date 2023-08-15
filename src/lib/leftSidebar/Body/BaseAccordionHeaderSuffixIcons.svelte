<script lang="ts" context="module">
  export type BaseAccordionHeaderSuffixIcon = {
    name: BaseIconProps["name"];
    size: BaseSize;
  };
</script>

<script lang="ts">
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import classNames from "classnames";
  import { getFrontColorCategory } from "./fontStyle";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { BaseSize } from "$lib/base/baseSizes";
  import type { ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";

  export let height: `h-${string}`;
  export let bgColor: `bg-${string}` | undefined;
  export let isSelected: boolean;
  export let isHover: boolean;
  export let isOpenAccordion = true;
  export let suffixIcons: BaseAccordionHeaderSuffixIcon[];

  let frontColorCategory: ColorCategory;
  $: frontColorCategory = getFrontColorCategory(isSelected);
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    bgColor,
    height,
    "w-fit",
    "rounded-r",
    ""
  )}
>
  {#if suffixIcons.length > 0}
    <div class={classNames("flex", "flex-row")}>
      {#each suffixIcons as suffixIcon}
        <BaseIcon
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
    {isHover}
    colorCategory={frontColorCategory}
  />
</div>
