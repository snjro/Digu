import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { ContractRow } from "./gridRows";
import { columnDefAbiParams } from "$lib/gridColumnDefs/columnDefAbiParams";
import { columnDefStateMutability } from "$lib/gridColumnDefs/columnDefStateMutability";

export const columnDefsConstructor = <T extends ContractRow>(
  maxLengthOfConstructorInputsParams: number
): ColumnDef => {
  const columnDef: ColumnDef = {
    headerName: "Constructor",
    children: [
      columnDefStateMutability<T>("contractConstructorStateMutability"),
      columnDefAbiParams<T>(
        "contractConstructorInputs",
        "inputs",
        maxLengthOfConstructorInputsParams,
        false
      ),
    ],
  };
  return columnDef;
};
