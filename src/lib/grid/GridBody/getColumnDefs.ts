import type { ValueGetterParams } from "ag-grid-community";
import type { ColumnDef } from "../types";
export const ColIdRowSequenceNumber = "rowSequenceNumber";
// The column of the row numbers first.
export function getColumnDefs(paramColumnDefs: ColumnDef[]): ColumnDef[] {
  const columnDefRowNumber: ColumnDef = {
    colId: ColIdRowSequenceNumber,
    headerName: "#",
    valueGetter: (params: ValueGetterParams): number =>
      (params.node?.rowIndex ?? 0) + 1,
    // The position on the screen, which the earlier searches change.
    getQuickFilterText: (): string => "",
    filter: false,
    // Aligned to the right by its own classes: the type numericColumn would
    // align the header "#" to the right too.
    cellClass: "tabular-nums grid justify-end text-right",
    maxWidth: 70,
    pinned: "left",
    suppressHeaderMenuButton: true,
    sortable: false,
    suppressSizeToFit: true,
    suppressMovable: true,
  };
  return [columnDefRowNumber, ...paramColumnDefs];
}
