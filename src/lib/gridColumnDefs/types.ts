import type { FunctionRow } from "$lib/gridColumnDefs/rowTypes";
import type { EventRow } from "$lib/gridColumnDefs/rowTypes";
import type { ContractRow } from "$lib/gridColumnDefs/rowTypes";

export type AbiRow = ContractRow | FunctionRow | EventRow;
export type AbiFragmentParamTypeName = "inputs" | "outputs";
