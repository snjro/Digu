import type { ColDef, ColGroupDef } from "ag-grid-community";
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
    valueGetter: "node.rowIndex + 1",
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
    suppressMenu: true,
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
    // "px-1",
    // "text-lg",
    // "border-r",
    // "border-white",
    // headerColorBg,
    groupColumnDef.headerClass?.toString(),
  );
}
function setGroupColumnClassCell(groupColumnDef: ColGroupDef): void {
  // for (const childColumnDef of groupColumnDef.children) {
  //   setSingleColumnClass(childColumnDef);
  // }
  for (let i = 0; i < groupColumnDef.children.length; i++) {
    setSingleColumnClass(groupColumnDef.children[i]);
  }
}
function setSingleColumnClassHeader(singleColumnDef: ColDef): void {
  singleColumnDef.headerClass = classNames(
    // "px-1",
    // "text-md",
    // "border-y border-r",
    // "border-white",
    // headerColorBg,
    singleColumnDef.headerClass?.toString(),
  );
}
function setSingleColumnClassCell(singleColumnDef: ColDef): void {
  singleColumnDef.cellClass = classNames(
    // "px-1",
    // "text-md",
    // "flex",
    // "items-center",
    // "bg-black",
    // "border-l",
    // "border-gray-700",
    singleColumnDef.cellClass ? singleColumnDef.cellClass.toString() : "",
  );
}
