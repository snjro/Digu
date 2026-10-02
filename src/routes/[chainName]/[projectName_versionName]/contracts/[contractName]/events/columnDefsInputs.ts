import type { ColumnDef } from "#lib/grid/types.js";
import type { EventRow } from "#lib/gridColumnDefs/rowTypes.js";
import { columnDefAbiParams } from "#lib/gridColumnDefs/columnDefAbiParams.js";

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
