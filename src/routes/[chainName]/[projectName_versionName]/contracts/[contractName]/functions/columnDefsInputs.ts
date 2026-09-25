import type { ColumnDef } from "$lib/grid/types";
import type { FunctionRow } from "$lib/gridColumnDefs/rowTypes";
import { columnDefAbiParams } from "$lib/gridColumnDefs/columnDefAbiParams";

export const columnDefsInputs = <T extends FunctionRow>(
  maxLengthOfFunctionInputsParams: number,
): ColumnDef => {
  const columnDef: ColumnDef = columnDefAbiParams<T>(
    "functionInputs",
    "inputs",
    maxLengthOfFunctionInputsParams,
    false,
  );
  return columnDef;
};
