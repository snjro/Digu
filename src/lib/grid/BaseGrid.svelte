<script lang="ts" generics="GridRow">
  import PageWrapperContent from "#lib/PageWrapper/PageWrapperContent.svelte";
  import type { ExportFilePrefix } from "#utils/utilsFile.js";
  import type { GridApi } from "ag-grid-community";
  import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";
  import GridBody from "./GridBody/GridBody.svelte";
  import type { InfiniteRows } from "./infiniteRows";
  import type { ColumnDef } from "./types";
  import type { Readable } from "svelte/store";

  interface Props {
    isFullScreen?: boolean;
    paramColumnDefs: ColumnDef[];
    // The rows of the Client-Side Row Model.
    rows?: GridRow[] | undefined;
    // In place of rows, for the Infinite Row Model.
    infiniteRows?: InfiniteRows<GridRow>;
    // Shown with the spinner while the rows are loaded.
    loadingText?: string;
    exportFilePrefix: ExportFilePrefix;
    hasMultipleTabs: boolean;
    gridApi?: GridApi<GridRow> | undefined;
    // The stores that the value getters read. See GridBody.
    refreshSortFilterOn?: Readable<unknown>[];
  }

  let {
    isFullScreen = $bindable(false),
    paramColumnDefs,
    rows,
    infiniteRows,
    loadingText,
    exportFilePrefix,
    hasMultipleTabs,
    gridApi = $bindable(),
    refreshSortFilterOn,
  }: Props = $props();
</script>

<PageWrapperContent isAgGrid {hasMultipleTabs}>
  {#snippet PageWrapperContentFunctionBar()}
    <BaseGridFunctionBar
      {gridApi}
      {rows}
      {infiniteRows}
      bind:isFullScreen
      {exportFilePrefix}
    />
  {/snippet}

  {#snippet PageWrapperContentBody()}
    <div class="flex flex-col h-full">
      <GridBody
        bind:gridApi
        {paramColumnDefs}
        {rows}
        {infiniteRows}
        {loadingText}
        {refreshSortFilterOn}
      />
    </div>
  {/snippet}
</PageWrapperContent>
