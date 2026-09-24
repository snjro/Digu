<script lang="ts">
  import type { BaseSize } from "../baseSizes";
  import BaseTableHeaderCell, {
    type BaseTableHeaderCellProps,
  } from "./BaseTableHeaderCell.svelte";

  interface Props {
    colorCategoryBg?: BaseTableHeaderCellProps["colorCategoryBg"];
    colorCategoryBorder?: BaseTableHeaderCellProps["colorCategoryBorder"];
    textSize: BaseSize;
    numOfTableRows: number;
  }

  let {
    colorCategoryBg = undefined,
    colorCategoryBorder = undefined,
    textSize,
    numOfTableRows,
  }: Props = $props();

  let width: `w-${number}` = $derived.by(() => {
    if (numOfTableRows > 999) {
      return "w-12";
    } else if (numOfTableRows > 99) {
      return "w-10";
    } else if (numOfTableRows > 9) {
      return "w-8";
    } else {
      return "w-6";
    }
  });
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
