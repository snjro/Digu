import type { ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { ColumnDef } from "../types";
export function getColumnDefs(paramColumnDefs: ColumnDef[]): ColumnDef[] {
  return addRowNumberColumnDefs(paramColumnDefs);
}
export const ColIdRowSequenceNumber = "rowSequenceNumber";
function addRowNumberColumnDefs(paramColumnDefs: ColumnDef[]): ColumnDef[] {
  const columnDefRowNumber: ColumnDef = {
    colId: ColIdRowSequenceNumber,
    headerName: "#",
    valueGetter: (params: ValueGetterParams): number =>
      (params.node?.rowIndex ?? 0) + 1,
    // The position on the screen, which the earlier searches change.
    getQuickFilterText: (): string => "",
    filter: false,
    cellClass: classNames(
      "tabular-nums",
      "grid",
      "justify-end",
      "text-right",
      "",
    ),
    // Not the type numericColumn, whose header class would move "#" to the
    // right.
    maxWidth: 70,
    pinned: "left",
    suppressHeaderMenuButton: true,
    sortable: false,
    suppressSizeToFit: true,
    suppressMovable: true,
  };
  const concattedColumnDefs: ColumnDef[] = [columnDefRowNumber].concat(
    paramColumnDefs,
  );
  return concattedColumnDefs;
}
