import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { AbiFragmentParam } from "@constants/chains/types";
import type { AbiRow } from "./type,";

export function getAbiParamsFromAbiRow<T extends AbiRow>(
  targetParams: ValueGetterParams<T> | ICellRendererParams<T>,
  abiParamsKey: keyof T,
): AbiFragmentParam[] {
  return targetParams.data
    ? (targetParams.data[abiParamsKey] as AbiFragmentParam[])
    : [];
}
