import type { ColumnDef } from "#lib/grid/types.js";
import { columnDefStateMutability } from "#lib/gridColumnDefs/columnDefStateMutability.js";
import type { ContractRow } from "#lib/gridColumnDefs/rowTypes.js";

export const columnDefsFallback = <T extends ContractRow>(): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Fallback",
    children: [columnDefStateMutability<T>("contractFallbackStateMutability")],
  };
  return columnDef;
};
