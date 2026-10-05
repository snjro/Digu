import type { ColDef, ColGroupDef, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import type { ColumnDef } from "../types";
export function getColumnDefs(paramColumnDefs: ColumnDef[]): ColumnDef[] {
  const editedColumnDefs: ColumnDef[] = addRowNumberColumnDefs(paramColumnDefs);
  for (const targetColumnDef of editedColumnDefs) {
    if (Object.prototype.hasOwnProperty.call(targetColumnDef, "children")) {
      setGroupColumnClass(targetColumnDef as ColGroupDef);
    } else {
      setSingleColumnClass(targetColumnDef);
    }
  }
  return editedColumnDefs;
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
    type: "numericColumn",
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

function setGroupColumnClass(groupColumnDef: ColGroupDef): void {
  setGroupColumnClassHeader(groupColumnDef);
  setGroupColumnClassCell(groupColumnDef);
}
function setSingleColumnClass(singleColumnDef: ColDef): void {
  setSingleColumnClassHeader(singleColumnDef);
  setSingleColumnClassCell(singleColumnDef);
}
function setGroupColumnClassHeader(groupColumnDef: ColGroupDef): void {
  groupColumnDef.headerClass = classNames(
    groupColumnDef.headerClass?.toString(),
  );
}
function setGroupColumnClassCell(groupColumnDef: ColGroupDef): void {
  for (let i = 0; i < groupColumnDef.children.length; i++) {
    setSingleColumnClass(groupColumnDef.children[i]);
  }
}
function setSingleColumnClassHeader(singleColumnDef: ColDef): void {
  singleColumnDef.headerClass = classNames(
    singleColumnDef.headerClass?.toString(),
  );
}
function setSingleColumnClassCell(singleColumnDef: ColDef): void {
  singleColumnDef.cellClass = classNames(
    singleColumnDef.cellClass ? singleColumnDef.cellClass.toString() : "",
  );
}
