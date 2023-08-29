<script lang="ts" generics="GridRow">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { numberWithCommas } from "@utils/utilsCommon";
  import { NO_DATA } from "@utils/utilsCostants";
  import type { GridOptions } from "ag-grid-community";
  import classNames from "classnames";

  export let rows: GridRow[];
  export let gridOptions: GridOptions<GridRow>;

  let numOfFilteredRows: string = NO_DATA;
  $: {
    gridOptions.onFilterChanged = () => {
      if (gridOptions.api?.isAnyFilterPresent()) {
        numOfFilteredRows = numberWithCommas(
          gridOptions.api!.getDisplayedRowCount(),
        );
      } else {
        numOfFilteredRows = NO_DATA;
      }
    };
  }

  let numOfAllRows: string;
  $: numOfAllRows = numberWithCommas(rows.length);

  let text: string;
  $: text = `Rows( filtered: ${numOfFilteredRows} , all: ${numOfAllRows})`;
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "items-center",
    "justify-end",
    "pr-3",
    "",
  )}
>
  <BaseLabel {text} />
</div>
