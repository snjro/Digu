import type { ColumnDef } from "$lib/grid/types";
import type { EventRow } from "$lib/gridColumnDefs/rowTypes";
import { columnDefAbiParams } from "$lib/gridColumnDefs/columnDefAbiParams";

export const columnDefsInputs = <T extends EventRow>(
  maxLengthOfEventInputsParams: number,
): ColumnDef => {
  const columnDef: ColumnDef = columnDefAbiParams<T>(
    "eventInputs",
    "inputs",
    maxLengthOfEventInputsParams,
    true,
  );
  return columnDef;
};
