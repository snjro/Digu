import type { ColumnDef } from "#lib/grid/types.js";
import type { FunctionRow } from "#lib/gridColumnDefs/rowTypes.js";
import { columnDefAbiParams } from "#lib/gridColumnDefs/columnDefAbiParams.js";

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
