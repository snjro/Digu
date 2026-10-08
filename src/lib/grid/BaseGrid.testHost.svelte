<script lang="ts">
  import type { GridApi } from "ag-grid-community";
  import BaseGrid from "./BaseGrid.svelte";
  import type { InfiniteRows } from "./infiniteRows";

  // As EventLogs: it keeps gridApi while an anonymous event removes the grid.
  interface Props {
    infiniteRows: InfiniteRows<unknown>;
    shown: boolean;
  }
  let { infiniteRows, shown }: Props = $props();
  let gridApi: GridApi | undefined = $state.raw();
</script>

{#if shown}
  <BaseGrid
    paramColumnDefs={[{ colId: "name", field: "name" }]}
    {infiniteRows}
    exportFilePrefix="eventLogs"
    hasMultipleTabs={false}
    bind:gridApi
  />
{/if}
<span data-testid="gridApi"
  >{gridApi ? (gridApi.isDestroyed() ? "destroyed" : "live") : "none"}</span
>
