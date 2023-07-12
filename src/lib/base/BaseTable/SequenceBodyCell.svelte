<script lang="ts">
  import type { BaseSize } from "../baseSizes";
  import BaseTableBodyCell, {
    type BaseTableBodyCellProps,
  } from "./BaseTableBodyCell.svelte";
  export let textSize: BaseSize;
  export let rowIndex: number;
  export let colorCategoryBg: BaseTableBodyCellProps["colorCategoryBg"] =
    undefined;
  export let colorCategoryBorder: BaseTableBodyCellProps["colorCategoryBorder"] =
    undefined;
</script>

<BaseTableBodyCell
  text={(rowIndex + 1).toString()}
  align="right"
  {textSize}
  {colorCategoryBg}
  {colorCategoryBorder}
  showBorderRight
/>
