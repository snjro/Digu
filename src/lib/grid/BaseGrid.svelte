<script lang="ts" generics="GridRow">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import type { ExportFilePrefix } from "@utils/utilsFile";
  import type { GridApi } from "ag-grid-community";
  import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";
  import GridBody from "./GridBody/GridBody.svelte";
  import type { ColumnDef } from "./types";

  interface Props {
    isFullScreen?: boolean;
    paramColumnDefs: ColumnDef[];
    rows: GridRow[] | undefined;
    exportFilePrefix: ExportFilePrefix;
    hasMultipleTabs: boolean;
  }

  let {
    isFullScreen = $bindable(false),
    paramColumnDefs,
    rows,
    exportFilePrefix,
    hasMultipleTabs,
  }: Props = $props();

  let gridApi: GridApi<GridRow> | undefined = $state.raw();
</script>

<PageWrapperContent isAgGrid {hasMultipleTabs}>
  {#snippet PageWrapperContentFunctionBar()}
    <BaseGridFunctionBar
      {gridApi}
      {rows}
      bind:isFullScreen
      {exportFilePrefix}
    />
  {/snippet}

  {#snippet PageWrapperContentBody()}
    <div class="flex flex-col h-full">
      <GridBody bind:gridApi {paramColumnDefs} {rows} />
    </div>
  {/snippet}
</PageWrapperContent>
<!-- <style>
  :global(.abi-row-border-only-first) {
    border-top: solid 1px var(--color-frame-border) !important;
  }
  :global(.ag-theme-balham-dark .ag-cell) {
    border-left: solid 1px red;
  }
</style> -->
