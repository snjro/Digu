import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { EventRow } from "./gridRows";
import { columnDefAbiParams } from "../../../../../../gridColumnDefs/columnDefAbiParams";

export const columnDefsInputs = <T extends EventRow>(
  maxLengthOfEventInputsParams: number
): ColumnDef => {
  const columnDef: ColumnDef = columnDefAbiParams<T>(
    "eventInputs",
    "inputs",
    maxLengthOfEventInputsParams,
    true
  );
  return columnDef;
};
