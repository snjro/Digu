import type { ColumnDef } from "#lib/grid/types.js";
import type { FunctionRow } from "#lib/gridColumnDefs/rowTypes.js";
import { columnDefAbiParams } from "#lib/gridColumnDefs/columnDefAbiParams.js";

export const columnDefsOutputs = <T extends FunctionRow>(
  maxLengthOfFunctionOutputsParams: number,
): ColumnDef => {
  const columnDef: ColumnDef = columnDefAbiParams<T>(
    "functionOutputs",
    "outputs",
    maxLengthOfFunctionOutputsParams,
    false,
  );
  return columnDef;
};
