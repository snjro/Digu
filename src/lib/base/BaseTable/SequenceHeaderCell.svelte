<script lang="ts">
  import type { BaseSize } from "../baseSizes";
  import BaseTableHeaderCell, {
    type BaseTableHeaderCellProps,
  } from "./BaseTableHeaderCell.svelte";

  export let colorCategoryBg: BaseTableHeaderCellProps["colorCategoryBg"] =
    undefined;
  export let colorCategoryBorder: BaseTableHeaderCellProps["colorCategoryBorder"] =
    undefined;
  export let textSize: BaseSize;
  export let numOfTableRows: number;

  let width: `w-${number}`;
  $: {
    if (numOfTableRows > 999) {
      width = "w-12";
    } else if (numOfTableRows > 99) {
      width = "w-10";
    } else if (numOfTableRows > 9) {
      width = "w-8";
    } else {
      width = "w-6";
    }
  }
</script>

<BaseTableHeaderCell
  text="#"
  align="center"
  {width}
  {textSize}
  {colorCategoryBg}
  {colorCategoryBorder}
  showBorderRight
/>
