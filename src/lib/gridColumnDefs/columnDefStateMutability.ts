import type { ColumnDef } from "$lib/base/BaseGrid/types";
import classNames from "classnames";

export const columnDefStateMutability = <T>(fieldName: keyof T): ColumnDef => {
  const columnDef: ColumnDef = {
    field: fieldName as string,
    headerName: "State Mutability",
    sortable: true,
    editable: false,
    cellClass: classNames("text-center"),
    columnGroupShow: undefined,
  };
  return columnDef;
};
