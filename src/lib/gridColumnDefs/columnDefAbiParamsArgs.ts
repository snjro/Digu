import type { ColumnDef } from "$lib/base/BaseGrid/types";
import { capitalizeFirstLetter } from "@utils/utilsCommon";
import { columnDefAbiParamsArgsChildren } from "./columnDefAbiParamsArgsChildren";
import type { AbiFragmentParamTypeName, AbiRow } from "./type,";

export const columnDefAbiParamsArgs = <T extends AbiRow>(
  abiParamsKey: keyof T,
  paramTypeName: AbiFragmentParamTypeName,
  maxLengthOfArgs: number,
  showAbiParamsInputIndexedField: boolean,
): ColumnDef[] => {
  let columnDefs: ColumnDef[] = [];
  for (
    let indexOfArgs: number = 0;
    indexOfArgs <= maxLengthOfArgs - 1;
    indexOfArgs++
  ) {
    let abiParamArgHeaderName: string = headerName(paramTypeName, indexOfArgs);
    let columnDefAbiParamsArgsChild: ColumnDef = {
      headerName: abiParamArgHeaderName,
      columnGroupShow: "open",
      children: columnDefAbiParamsArgsChildren(
        abiParamsKey,
        showAbiParamsInputIndexedField,
        abiParamArgHeaderName,
        indexOfArgs,
      ),
    };

    columnDefs.push(columnDefAbiParamsArgsChild);
  }
  return columnDefs;
};

const headerName = (
  paramTypeName: AbiFragmentParamTypeName,
  indexOfArgs: number,
): string => {
  return `${capitalizeFirstLetter(paramTypeName.slice(0, -1))} ${
    indexOfArgs + 1
  }`;
};
