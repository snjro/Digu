import type { ColumnDef } from "#lib/grid/types.js";
import type { FunctionRow } from "#lib/gridColumnDefs/rowTypes.js";
import { columnDefsBasic } from "./columnDefsBasic";
import { columnDefsInputs } from "./columnDefsInputs";
import { columnDefsOutputs } from "./columnDefsOutputs";

export const columnDefs = <T extends FunctionRow>(
  urlPathName: string,
  maxLengthOfFunctionInputsParams: number,
  maxLengthOfFunctionOutputsParams: number,
): ColumnDef[] => {
  const columnDefs: ColumnDef[] = [
    columnDefsBasic<T>(urlPathName),
    columnDefsInputs<T>(maxLengthOfFunctionInputsParams),
    columnDefsOutputs<T>(maxLengthOfFunctionOutputsParams),
  ];
  return columnDefs;
};
