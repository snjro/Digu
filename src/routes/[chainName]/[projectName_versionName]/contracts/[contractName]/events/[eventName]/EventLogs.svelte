<script lang="ts" module>
  export const MESSAGE_ANONYMOUS_EVENT_LOGS: string =
    "Logs of anonymous events are not fetched.";
  // While the sync saves logs, reload the rows at most once in this time.
  export const EVENT_LOGS_RELOAD_INTERVAL: number = 3000;
  export const MESSAGE_WAITING_FOR_IMPORT: string =
    "Waiting for the import of logs";
</script>

<script lang="ts">
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseGrid from "#lib/grid/BaseGrid.svelte";
  import type { ColumnDef } from "#lib/grid/types.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import type { EventAbiFragment } from "#constants/chains/types.js";
  import type { AbiFragmentIdentifier } from "#db/dbTypes.js";
  import type { InfiniteRows } from "#lib/grid/infiniteRows.js";
  import type {
    EventLogsTableState,
    StoredEventLog,
  } from "#db/eventLogsTable.js";
  import { EventLogsTableClient } from "#db/eventLogsTable.worker.portal.js";
  import type { GridApi, IDatasource } from "ag-grid-community";
  import { columnDefs } from "./columnDefs";
  import {
    createEventLogsDatasource,
    getEventLogRowId,
    openEventLogsTable,
    type EventLogsDatasource,
  } from "./eventLogsDatasource";
  import { createThrottledLoad } from "./latestLoad";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import {
    selectWarpSyncState,
    storeWarpSync,
  } from "#warpSync/warpSyncState.js";

  interface Props {
    targetEventIdentifier: AbiFragmentIdentifier;
    targetEventAbiFragment: EventAbiFragment;
    isFullScreen: boolean;
  }

  let {
    targetEventIdentifier,
    targetEventAbiFragment,
    isFullScreen = $bindable(),
  }: Props = $props();

  // The sync adds to it when it saves logs of this event.
  let recordCount: number | undefined = $derived(
    $storeSyncStatus[targetEventIdentifier.chainName].subSyncStatuses[
      targetEventIdentifier.projectName
    ].subSyncStatuses[targetEventIdentifier.versionName].subSyncStatuses[
      targetEventIdentifier.contractName
    ]?.events[targetEventIdentifier.abiFragmentName]?.recordCount,
  );

  // While the warp sync imports the logs of the chain, the table has no rows
  // and reads them once the import ends, not after each of its files.
  let isImporting: boolean = $derived(
    selectWarpSyncState($storeWarpSync, targetEventIdentifier.chainName)
      .status === "importing",
  );

  let gridApi: GridApi<StoredEventLog> | undefined = $state.raw();
  // The grid keeps it while it lives, and the datasource reads it.
  const quickSearch: { text: string } = { text: "" };
  // undefined while the table worker reads the rows.
  let tableState: EventLogsTableState | undefined = $state.raw();
  let datasource: EventLogsDatasource | undefined = $state.raw();
  // The rows of the last query that the grid got.
  let filteredRowCount: number | undefined = $state();

  // The table worker keeps the rows of the event while the table shows them,
  // and is stopped when the table closes, shows another event or waits for
  // the import.
  $effect.pre(() => {
    tableState = undefined;
    datasource = undefined;
    filteredRowCount = undefined;
    if (targetEventAbiFragment.anonymous || isImporting) return;
    const eventIdentifier: AbiFragmentIdentifier = targetEventIdentifier;
    const client: EventLogsTableClient = new EventLogsTableClient();
    let isOpen: boolean = false;
    let isClosed: boolean = false;
    const throttledLoad = createThrottledLoad(
      (signal: AbortSignal) =>
        isOpen
          ? client.refresh()
          : openEventLogsTable(client, eventIdentifier, signal),
      (state: EventLogsTableState | undefined) => {
        if (!isOpen) {
          // A table that could not be read shows no rows, and is read again
          // when the sync saves logs of the event.
          isOpen = state !== undefined;
          tableState = state ?? { rowCount: 0, argsMaxLengths: [] };
          datasource = createEventLogsDatasource(
            isOpen ? client : undefined,
            quickSearch,
            {
              onRowCount: (rowCount: number) => {
                filteredRowCount = rowCount;
              },
              isClosed: () => isClosed,
            },
          );
          return;
        }
        tableState = state;
        // The shown blocks again, on the same page.
        gridApi?.refreshInfiniteCache();
      },
      EVENT_LOGS_RELOAD_INTERVAL,
    );
    // Reload when new logs are saved.
    $effect.pre(() => {
      void recordCount;
      throttledLoad.request();
    });
    return () => {
      isClosed = true;
      // Before terminate(), so that the stopped load is not logged.
      throttledLoad.dispose();
      client.terminate();
    };
  });
  // Keep the same array while the lengths do not change, so new rows do not
  // rebuild the columns.
  let previousArgsMaxLengths: number[] = [];
  let eachArgsMaxLengths: number[] = $derived.by(() => {
    const lengths: number[] = tableState?.argsMaxLengths ?? [];
    if (lengths.join(",") !== previousArgsMaxLengths.join(",")) {
      previousArgsMaxLengths = lengths;
    }
    return previousArgsMaxLengths;
  });
  let eventLogColumnDefs: ColumnDef[] = $derived(
    columnDefs(targetEventAbiFragment, eachArgsMaxLengths),
  );
  let infiniteRows: InfiniteRows<StoredEventLog> = $derived({
    datasource: datasource as IDatasource | undefined,
    getRowId: getEventLogRowId,
    quickSearch,
    csv: datasource?.csv,
    rowCounts: {
      all: tableState?.rowCount,
      filteredAndSorted: filteredRowCount,
    },
  });
</script>

{#if targetEventAbiFragment.anonymous}
  <BaseLabel
    text={MESSAGE_ANONYMOUS_EVENT_LOGS}
    italic
    textSize={sizeSettings.itemWarningMessage}
  />
{:else}
  <BaseGrid
    paramColumnDefs={eventLogColumnDefs}
    {infiniteRows}
    loadingText={isImporting ? MESSAGE_WAITING_FOR_IMPORT : undefined}
    exportFilePrefix="eventLogs"
    hasMultipleTabs={true}
    bind:isFullScreen
    bind:gridApi
  />
{/if}
