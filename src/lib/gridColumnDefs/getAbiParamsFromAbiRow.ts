import type { ICellRendererParams, ValueGetterParams } from "ag-grid-community";
import type { AbiFragmentParam } from "#constants/chains/types.js";
import type { AbiRow } from "./types";

export function getAbiParamsFromAbiRow<T extends AbiRow>(
  targetParams: ValueGetterParams<T> | ICellRendererParams<T>,
  abiParamsKey: keyof T,
): AbiFragmentParam[] {
  return targetParams.data
    ? (targetParams.data[abiParamsKey] as AbiFragmentParam[])
    : [];
}
