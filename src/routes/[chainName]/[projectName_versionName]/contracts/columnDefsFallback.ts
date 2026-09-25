import type { ColumnDef } from "$lib/grid/types";
import { columnDefStateMutability } from "$lib/gridColumnDefs/columnDefStateMutability";
// import classNames from "classnames";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";

// const cellClass: string = classNames("text-center");
// const sortable = true;
// const editable = false;
export const columnDefsFallback = <T extends ContractRow>(): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Fallback",
    children: [columnDefStateMutability<T>("contractFallbackStateMutability")],
  };
  return columnDef;
};
