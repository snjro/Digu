import type { ColumnDef } from "$lib/base/BaseGrid/types";
import { capitalizeFirstLetter } from "@utils/utilsCommon";
import { columnDefAbiParamsNumOfParams } from "./columnDefAbiParamsNumOfParams";
import { columnDefAbiParamsArgs } from "./columnDefAbiParamsArgs";
import type { AbiFragmentParamTypeName, AbiRow } from "./type,";

export const columnDefAbiParams = <T extends AbiRow>(
  abiParamsKey: keyof T,
  paramTypeName: AbiFragmentParamTypeName,
  maxLengthOfAbiParamsArgs: number,
  showAbiParamsInputIndexedField: boolean,
): ColumnDef => {
  return {
    headerName: capitalizeFirstLetter(paramTypeName),
    columnGroupShow: "open",
    openByDefault: false,
    children: [
      columnDefAbiParamsNumOfParams(
        abiParamsKey,
        paramTypeName,
        showAbiParamsInputIndexedField,
      ),
      ...columnDefAbiParamsArgs(
        abiParamsKey,
        paramTypeName,
        maxLengthOfAbiParamsArgs,
        showAbiParamsInputIndexedField,
      ),
    ],
  };
};
