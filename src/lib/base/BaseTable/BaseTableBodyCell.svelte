<script lang="ts" context="module">
  export type BaseTableBodyCellProps = {
    colorCategoryFront?: ColorCategory;
    colorCategoryBg?: ColorCategory;
    colorCategoryBorder?: ColorCategory;
    align: "left" | "center" | "right" | "stretch";
    textSize: BaseSize;
    text?: string;
    fontMono?: boolean;
    showBorderRight?: boolean;
  };
</script>

<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BaseLabel from "../BaseLabel.svelte";
  import type { BaseSize } from "../baseSizes";

  export let text: BaseTableBodyCellProps["text"] = undefined;
  export let colorCategoryFront: BaseTableBodyCellProps["colorCategoryFront"] =
    undefined;
  export let colorCategoryBg: BaseTableBodyCellProps["colorCategoryBg"] =
    undefined;
  export let colorCategoryBorder: BaseTableBodyCellProps["colorCategoryBorder"] =
    undefined;
  export let textSize: BaseTableBodyCellProps["textSize"];
  export let align: BaseTableBodyCellProps["align"];
  export let fontMono: BaseTableBodyCellProps["fontMono"] = false;
  export let showBorderRight: BaseTableBodyCellProps["showBorderRight"] = false;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor;

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

<td
  class={classNames(
    "px-1",
    fontMono && "font-mono",
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
    "",
  )}
>
  <div class={classNames("flex ", celldAlign(), "content-center")}>
    {#if text}
      <BaseLabel {text} {textSize} />
    {/if}
    <slot />
  </div>
</td>
