import type { FunctionRow } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/functions/gridRows";
import type { EventRow } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/gridRows";
import type { ContractRow } from "@routes/[chainName]/[projectName_versionName]/contracts/gridRows";

export type AbiRow = ContractRow | FunctionRow | EventRow;
export type AbiFragmentParamTypeName = "inputs" | "outputs";
