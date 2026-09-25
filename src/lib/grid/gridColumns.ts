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
  // columnApi.autoSizeAllColumns(skipHeader);
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
