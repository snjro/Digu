import type {
  ContractInterface,
  EventAbiFragment,
  FunctionAbiFragment,
} from "@constants/chains/types";
import { jsonStringifyFormatted } from "@utils/utilsCommon";
import type { AbiFormatType } from "@utils/utilsEthers";

export type TargetAbi =
  ContractInterface | EventAbiFragment | FunctionAbiFragment;

export function isTargetContractInterface(
  targetAbi: TargetAbi,
): targetAbi is ContractInterface {
  return Object.prototype.hasOwnProperty.call(targetAbi, "fragments");
}

export function formatTargetAbi(
  targetAbi: TargetAbi,
  abiFormat: AbiFormatType,
) {
  switch (abiFormat) {
    case "json":
      return isTargetContractInterface(targetAbi)
        ? targetAbi.fragments
        : targetAbi;
    case "full": // Human readable full
      return isTargetContractInterface(targetAbi)
        ? targetAbi.format(false)
        : targetAbi.format("full");
    case "minimal": // Human readable minimal
      return isTargetContractInterface(targetAbi)
        ? targetAbi.format(true)
        : targetAbi.format("minimal");
  }
}

// Only the JSON format is JSON. The human readable formats are plain text.
export function getAbiFileExtension(abiFormat: AbiFormatType): "json" | "txt" {
  return abiFormat === "json" ? "json" : "txt";
}

export function getAbiExportTooltipText(abiFormat: AbiFormatType): string {
  return getAbiFileExtension(abiFormat) === "json"
    ? "Export as JSON"
    : "Export as text";
}

export function getAbiText(
  targetAbi: TargetAbi,
  abiFormat: AbiFormatType,
  isExpanded: boolean,
): string {
  return isExpanded
    ? jsonStringifyFormatted(formatTargetAbi(targetAbi, abiFormat))
    : jsonStringifyFormatted(formatTargetAbi(targetAbi, abiFormat), 0);
}
