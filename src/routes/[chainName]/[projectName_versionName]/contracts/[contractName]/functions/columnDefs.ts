import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { FunctionRow } from "./gridRows";
import { columnDefsBasic } from "./columnDefsBasic";
import { columnDefsInputs } from "./columnDefsInputs";
import { columnDefsOutputs } from "./columnDefsOutputs";

export const columnDefs = <T extends FunctionRow>(
  urlPathName: string,
  maxLengthOfFunctionInputsParams: number,
  maxLengthOfFunctionOutputsParams: number
): ColumnDef[] => {
  const columnDefs: ColumnDef[] = [
    columnDefsBasic<T>(urlPathName),
    columnDefsInputs<T>(maxLengthOfFunctionInputsParams),
    columnDefsOutputs<T>(maxLengthOfFunctionOutputsParams),
  ];
  return columnDefs;
};
