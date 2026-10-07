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
// For the Infinite Row Model, whose rows have no data until the datasource
// answers: sizes the columns after the first rows come, or there are none.
export function setAutoColumnWidthWhenRowsCome(gridApi: GridApi): void {
  const onModelUpdated = (): void => {
    // The first row of the shown page.
    const firstRowIndex: number =
      gridApi.paginationGetCurrentPage() * gridApi.paginationGetPageSize();
    if (
      gridApi.getDisplayedRowCount() > 0 &&
      !gridApi.getDisplayedRowAtIndex(firstRowIndex)?.data
    ) {
      return;
    }
    gridApi.removeEventListener("modelUpdated", onModelUpdated);
    setAutoColumnWidth(gridApi);
  };
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
