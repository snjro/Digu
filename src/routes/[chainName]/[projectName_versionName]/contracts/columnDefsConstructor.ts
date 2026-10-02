import type { ColumnDef } from "#lib/grid/types.js";
import type { ContractRow } from "#lib/gridColumnDefs/rowTypes.js";
import { columnDefAbiParams } from "#lib/gridColumnDefs/columnDefAbiParams.js";
import { columnDefStateMutability } from "#lib/gridColumnDefs/columnDefStateMutability.js";

export const columnDefsConstructor = <T extends ContractRow>(
  maxLengthOfConstructorInputsParams: number,
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Constructor",
    openByDefault: false,
    children: [
      columnDefStateMutability<T>("contractConstructorStateMutability"),
      columnDefAbiParams<T>(
        "contractConstructorInputs",
        "inputs",
        maxLengthOfConstructorInputsParams,
        false,
      ),
    ],
  };
  return columnDef;
};
