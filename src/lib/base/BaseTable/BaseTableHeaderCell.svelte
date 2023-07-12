<script lang="ts" context="module">
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
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { BaseSize } from "../baseSizes";
  import BaseLabel from "../BaseLabel.svelte";

  export let text: BaseTableHeaderCellProps["text"] = undefined;
  export let colorCategoryFront: BaseTableHeaderCellProps["colorCategoryFront"] =
    undefined;
  export let colorCategoryBg: BaseTableHeaderCellProps["colorCategoryBg"] =
    undefined;
  export let colorCategoryBorder: BaseTableHeaderCellProps["colorCategoryBorder"] =
    undefined;
  export let textSize: BaseTableHeaderCellProps["textSize"];
  export let align: BaseTableHeaderCellProps["align"];
  export let width: BaseTableHeaderCellProps["width"] = "w-full";
  export let showBorderRight: BaseTableHeaderCellProps["showBorderRight"] =
    false;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  const celldAlign = ():
    | "justify-start"
    | "justify-center"
    | "justify-end"
    | "justify-stretch" => {
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
  };
</script>

<th
  class={classNames(
    "px-1",
    "font-mono",
    width,
    colorCategoryBg
      ? colorDefinitions[themeColor][colorCategoryBg].bg
      : "bg-inherit",
    colorCategoryFront
      ? colorDefinitions[themeColor][colorCategoryFront].text
      : "text-inherit",
    showBorderRight && "border-r",
    colorCategoryBorder
      ? colorDefinitions[themeColor][colorCategoryBorder].border
      : "border-inherit",
    ""
  )}
>
  <div class={classNames("flex ", celldAlign(), "content-center")}>
    {#if text}
      <BaseLabel {text} {textSize} />
    {/if}
    <slot />
  </div>
</th>
