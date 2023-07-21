import type {
  FilterChangedEvent,
  FirstDataRenderedEvent,
  GridApi,
  GridColumnsChangedEvent,
  // CellValueChangedEvent,
  GridOptions,
  RowClassParams,
  SortChangedEvent,
  // RowSelectedEvent,
} from "ag-grid-community";
import { ColIdRowSequenceNumber } from "./GridBody/getColumnDefs";
import { setAutoColumnWidth } from "./GridBody/GridBody.svelte";
// import { createEventDispatcher } from "svelte";

export function getGridOptions<T>(
  suppressFieldDotNotation: boolean,
  suppressRowTransform: boolean,
  suppressMovableColumns: boolean,
  suppressColumnVirtualisation: boolean,
  rowSelection: GridOptions["rowSelection"],
  getRowClass: ((params: RowClassParams) => string) | undefined
  // rows: T[]
): GridOptions<T> {
  // const dispatch = createEventDispatcher();
  let gridOptions: GridOptions<T> = {
    defaultColDef: {
      flex: 1,
      sortable: true,
      filter: true,
      editable: false,
      suppressMenu: false,
      resizable: true,
    },
    defaultColGroupDef: {
      openByDefault: true,
      marryChildren: true,
    },
    columnHoverHighlight: false,
    groupHeaderHeight: 30,
    headerHeight: 30,
    suppressFieldDotNotation: suppressFieldDotNotation,
    suppressRowTransform: suppressRowTransform,
    suppressMovableColumns: suppressMovableColumns,
    rowSelection: rowSelection,
    suppressColumnVirtualisation: suppressColumnVirtualisation,
    getRowClass: getRowClass,
    onSortChanged: (sortChangeEvent: SortChangedEvent): void => {
      refreshRowSeqenceNumber<T>(sortChangeEvent.api);
    },
    onFilterChanged: (filterChangedEvent: FilterChangedEvent) => {
      refreshRowSeqenceNumber<T>(filterChangedEvent.api);
    },
    onGridColumnsChanged: (
      gridColumnsChangedEvent: GridColumnsChangedEvent<T>
    ) => {
      setAutoColumnWidth(gridColumnsChangedEvent.columnApi);
    },

    onFirstDataRendered: (firstDataRenderedEvent: FirstDataRenderedEvent) => {
      setAutoColumnWidth(firstDataRenderedEvent.columnApi!);
    },
    // onSelectionChanged: (): void => {
    //   if (gridOptions.api) {
    //     const selectedRows = gridOptions.api.getSelectedRows();
    //     dispatch("selectionChanged", selectedRows);
    //   }
    // },
    // onCellValueChanged: (event: CellValueChangedEvent): void => {
    //   if (event.rowIndex) {
    //     rows[event.rowIndex] = event.data;
    //     dispatch("cellValueChanged", { row: event.rowIndex, data: event.data });
    //   }
    // },
    // onRowSelected: (rowSelectedEvent: RowSelectedEvent<T>): void => {
    //   dispatch("rowSelected", rowSelectedEvent);
    // },
  };
  return gridOptions;
}
function refreshRowSeqenceNumber<T>(gridApi: GridApi<T>) {
  gridApi.refreshCells({ columns: [ColIdRowSequenceNumber] });
}
