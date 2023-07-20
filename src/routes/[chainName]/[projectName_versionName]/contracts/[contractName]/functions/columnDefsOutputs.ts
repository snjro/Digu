import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { FunctionRow } from "./gridRows";
import { columnDefAbiParams } from "$lib/gridColumnDefs/columnDefAbiParams";

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
