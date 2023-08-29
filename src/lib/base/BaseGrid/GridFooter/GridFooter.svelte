<script lang="ts" generics="GridRow">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { numberWithCommas } from "@utils/utilsCommon";
  import type { GridOptions } from "ag-grid-community";
  import classNames from "classnames";

  export let rows: GridRow[];
  export let gridOptions: GridOptions<GridRow>;
  let filteredRowCount = rows.length;
  $: {
    gridOptions.onFilterChanged = () => {
      filteredRowCount = 0;
      gridOptions.api!.forEachNodeAfterFilter(() => {
        filteredRowCount++;
      });
    };
  }
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    "justify-end",
    "space-x-1",
    "pr-3",
  )}
>
  <BaseLabel text="Rows (filtered/all) :" />
  <BaseLabel
    text={`${numberWithCommas(filteredRowCount)}/${numberWithCommas(
      rows.length,
    )}`}
  />
</div>
