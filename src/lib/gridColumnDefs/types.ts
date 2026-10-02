import type { FunctionRow } from "#lib/gridColumnDefs/rowTypes.js";
import type { EventRow } from "#lib/gridColumnDefs/rowTypes.js";
import type { ContractRow } from "#lib/gridColumnDefs/rowTypes.js";

export type AbiRow = ContractRow | FunctionRow | EventRow;
export type AbiFragmentParamTypeName = "inputs" | "outputs";
