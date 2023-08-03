import type { ColumnDef } from "$lib/base/BaseGrid/types";
import type { FunctionRow } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/functions/gridRows";
import type { EventRow } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/gridRows";
import type { ContractRow } from "@routes/[chainName]/[projectName_versionName]/contracts/gridRows";
import { capitalizeFirstLetter } from "@utils/utilsCommon";
import { columnDefAbiParamsNumOfParams } from "./columnDefAbiParamsNumOfParams";
import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { AbiFragmentParam } from "@constants/chains/types";
import { columnDefAbiParamsArgs } from "./columnDefAbiParamsArgs";

export type AbiRow = ContractRow | FunctionRow | EventRow;

export type AbiFragmentParamTypeName = "inputs" | "outputs";

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
export function getAbiParamsFromAbiRow<T extends AbiRow>(
  targetParams: ValueGetterParams<T> | ICellRendererParams<T>,
  abiParamsKey: keyof T,
): AbiFragmentParam[] {
  return targetParams.data
    ? (targetParams.data[abiParamsKey] as AbiFragmentParam[])
    : [];
}
