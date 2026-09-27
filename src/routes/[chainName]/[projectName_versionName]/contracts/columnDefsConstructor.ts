import type { ColumnDef } from "$lib/grid/types";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";
import { columnDefAbiParams } from "$lib/gridColumnDefs/columnDefAbiParams";
import { columnDefStateMutability } from "$lib/gridColumnDefs/columnDefStateMutability";

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
