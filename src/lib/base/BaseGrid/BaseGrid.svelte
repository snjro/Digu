<script lang="ts" generics="GridRow">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import type { GridApi } from "ag-grid-community";
  import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";
  import GridBody from "./GridBody/GridBody.svelte";
  import type { ColumnDef } from "./types";

  export let isFullScreen = false;
  export let paramColumnDefs: ColumnDef[];
  export let rows: GridRow[] | undefined;
  export let exportFilePrefix: ExportFilePrefix;
  export let hasMultipulTabs: boolean;

  let gridApi: GridApi<GridRow>;
</script>

<PageWrapperContent isAgGrid {hasMultipulTabs}>
  <BaseGridFunctionBar
    slot="PageWrapperContentFunctionBar"
    {gridApi}
    {rows}
    bind:isFullScreen
    {exportFilePrefix}
  />

  <div class="flex flex-col h-full" slot="PageWrapperContentBody">
    <GridBody bind:gridApi {paramColumnDefs} {rows} />
  </div>
</PageWrapperContent>
<!-- <style>
  :global(.abi-row-border-only-first) {
    border-top: solid 1px var(--color-frame-border) !important;
  }
  :global(.ag-theme-balham-dark .ag-cell) {
    border-left: solid 1px red;
  }
</style> -->
