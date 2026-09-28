import type { ColumnDef } from "$lib/grid/types";
import { columnDefStateMutability } from "$lib/gridColumnDefs/columnDefStateMutability";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";

export const columnDefsFallback = <T extends ContractRow>(): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Fallback",
    children: [columnDefStateMutability<T>("contractFallbackStateMutability")],
  };
  return columnDef;
};
