import type { ColumnDef } from "#lib/grid/types.js";
import { capitalizeFirstLetter } from "#utils/utilsCommon.js";
import { columnDefAbiParamsNumOfParams } from "./columnDefAbiParamsNumOfParams";
import { columnDefAbiParamsArgs } from "./columnDefAbiParamsArgs";
import type { AbiFragmentParamTypeName, AbiRow } from "./types";

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
