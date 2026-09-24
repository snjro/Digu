<script lang="ts">
  import type { BaseSize } from "../baseSizes";
  import BaseTableBodyCell, {
    type BaseTableBodyCellProps,
  } from "./BaseTableBodyCell.svelte";
  interface Props {
    textSize: BaseSize;
    rowIndex: number;
    colorCategoryBg?: BaseTableBodyCellProps["colorCategoryBg"];
    colorCategoryBorder?: BaseTableBodyCellProps["colorCategoryBorder"];
  }

  let {
    textSize,
    rowIndex,
    colorCategoryBg = undefined,
    colorCategoryBorder = undefined,
  }: Props = $props();
</script>

<BaseTableBodyCell
  text={(rowIndex + 1).toString()}
  align="right"
  {textSize}
  {colorCategoryBg}
  {colorCategoryBorder}
  showBorderRight
/>
