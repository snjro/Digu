<script lang="ts" module>
  export type BaseTableHeaderCellProps = {
    colorCategoryFront?: ColorCategory;
    colorCategoryBg?: ColorCategory;
    colorCategoryBorder?: ColorCategory;
    align: "left" | "center" | "right" | "stretch";
    textSize: BaseSize;
    text?: string;
    width?: `w-${string}`;
    showBorderRight?: boolean;
  };
</script>

<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import BaseLabel from "../BaseLabel.svelte";
  import type { BaseSize } from "../baseSizes";
  import type { Snippet } from "svelte";

  interface Props {
    text?: BaseTableHeaderCellProps["text"];
    colorCategoryFront?: BaseTableHeaderCellProps["colorCategoryFront"];
    colorCategoryBg?: BaseTableHeaderCellProps["colorCategoryBg"];
    colorCategoryBorder?: BaseTableHeaderCellProps["colorCategoryBorder"];
    textSize: BaseTableHeaderCellProps["textSize"];
    align: BaseTableHeaderCellProps["align"];
    width?: BaseTableHeaderCellProps["width"];
    showBorderRight?: BaseTableHeaderCellProps["showBorderRight"];
    children?: Snippet;
  }

  let {
    text = undefined,
    colorCategoryFront = undefined,
    colorCategoryBg = undefined,
    colorCategoryBorder = undefined,
    textSize,
    align,
    width = "w-full",
    showBorderRight = false,
    children,
  }: Props = $props();

  let celldAlign:
    "justify-start" | "justify-center" | "justify-end" | "justify-stretch" =
    $derived.by(() => {
      switch (align) {
        case "left":
          return "justify-start";
        case "center":
          return "justify-center";
        case "right":
          return "justify-end";
        default:
          return "justify-stretch";
      }
    });
</script>

<th
  class={classNames(
    "px-1",
    "font-mono",
    width,
    colorCategoryBg ? colorClasses[colorCategoryBg].bg : "bg-inherit",
    colorCategoryFront ? colorClasses[colorCategoryFront].text : "text-inherit",
    showBorderRight && "border-r",
    colorCategoryBorder
      ? colorClasses[colorCategoryBorder].border
      : "border-inherit",
    "",
  )}
>
  <div class={classNames("flex ", celldAlign, "content-center")}>
    {#if text}
      <BaseLabel {text} {textSize} />
    {/if}
    {@render children?.()}
  </div>
</th>
