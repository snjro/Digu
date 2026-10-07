import type { GridApi } from "ag-grid-community";

export function setAutoColumnWidth(
  gridApi: GridApi,
  skipHeader: boolean = false,
  waitMilliSecond: number = 0,
): void {
  gridApi.sizeColumnsToFit(0);
  setTimeout(() => {
    gridApi.autoSizeAllColumns(skipHeader);
  }, waitMilliSecond);
}
// A block that fails never comes: stop waiting after this time.
export const ROWS_WAIT_MS: number = 60_000;
// The waiting of each grid, so that a new one replaces it.
const stopWaitingForRows: WeakMap<GridApi, () => void> = new WeakMap();
// For the Infinite Row Model, whose rows have no data until the datasource
// answers: sizes the columns after the first rows come, or there are none.
export function setAutoColumnWidthWhenRowsCome(gridApi: GridApi): void {
  stopWaitingForRows.get(gridApi)?.();
  const stop = (): void => {
    clearTimeout(timer);
    stopWaitingForRows.delete(gridApi);
    if (!gridApi.isDestroyed()) {
      gridApi.removeEventListener("modelUpdated", onModelUpdated);
    }
  };
  const onModelUpdated = (): void => {
    if (gridApi.isDestroyed()) return stop();
    // The first row of the shown page.
    const firstRowIndex: number =
      gridApi.paginationGetCurrentPage() * gridApi.paginationGetPageSize();
    if (
      gridApi.getDisplayedRowCount() > 0 &&
      !gridApi.getDisplayedRowAtIndex(firstRowIndex)?.data
    ) {
      return;
    }
    stop();
    setAutoColumnWidth(gridApi);
  };
  const timer: ReturnType<typeof setTimeout> = setTimeout(stop, ROWS_WAIT_MS);
  stopWaitingForRows.set(gridApi, stop);
  gridApi.addEventListener("modelUpdated", onModelUpdated);
}
export function setAllColumnGroupState(gridApi: GridApi, open: boolean): void {
  const stateItems: {
    groupId: string;
    open: boolean;
  }[] = [];
  for (const columnGroupState of gridApi.getColumnGroupState()) {
    stateItems.push({ groupId: columnGroupState.groupId, open: open });
  }
  gridApi.setColumnGroupState(stateItems);
  if (open) {
    setAutoColumnWidth(gridApi);
  }
}
