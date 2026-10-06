<script lang="ts" generics="GridRow">
  import PageWrapperContent from "#lib/PageWrapper/PageWrapperContent.svelte";
  import type { ExportFilePrefix } from "#utils/utilsFile.js";
  import type { GridApi } from "ag-grid-community";
  import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";
  import type { CsvMaker } from "./ExportCsv/csvFormat";
  import GridBody from "./GridBody/GridBody.svelte";
  import type { ColumnDef } from "./types";

  interface Props {
    isFullScreen?: boolean;
    paramColumnDefs: ColumnDef[];
    rows: GridRow[] | undefined;
    // Shown with the spinner while the rows are loaded.
    loadingText?: string;
    exportFilePrefix: ExportFilePrefix;
    hasMultipleTabs: boolean;
    // Makes the CSV of All in a worker instead of ag-grid.
    csvOfAllRows?: CsvMaker;
  }

  let {
    isFullScreen = $bindable(false),
    paramColumnDefs,
    rows,
    loadingText,
    exportFilePrefix,
    hasMultipleTabs,
    csvOfAllRows,
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
      {csvOfAllRows}
    />
  {/snippet}

  {#snippet PageWrapperContentBody()}
    <div class="flex flex-col h-full">
      <GridBody bind:gridApi {paramColumnDefs} {rows} {loadingText} />
    </div>
  {/snippet}
</PageWrapperContent>
