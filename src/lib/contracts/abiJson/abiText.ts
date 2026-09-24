import type {
  ContractInterface,
  EventAbiFragment,
  FunctionAbiFragment,
} from "@constants/chains/types";
import { jsonStringifyFormatted } from "@utils/utilsCommon";

export type TargetAbi =
  ContractInterface | EventAbiFragment | FunctionAbiFragment;

export function isTargetContractInterface(
  targetAbi: TargetAbi,
): targetAbi is ContractInterface {
  return Object.prototype.hasOwnProperty.call(targetAbi, "fragments");
}

export function formatTargetAbi(targetAbi: TargetAbi, abiFormatIndex: number) {
  switch (abiFormatIndex) {
    case 0: // JSON
      return isTargetContractInterface(targetAbi)
        ? targetAbi.fragments
        : targetAbi;
    case 1: // Human readable full
      return isTargetContractInterface(targetAbi)
        ? targetAbi.format(false)
        : targetAbi.format("full");
    default: // Human readable minimal
      return isTargetContractInterface(targetAbi)
        ? targetAbi.format(true)
        : targetAbi.format("minimal");
  }
}

export function getAbiText(
  targetAbi: TargetAbi,
  abiFormatIndex: number,
  isExpanded: boolean,
): string {
  return isExpanded
    ? jsonStringifyFormatted(formatTargetAbi(targetAbi, abiFormatIndex))
    : jsonStringifyFormatted(formatTargetAbi(targetAbi, abiFormatIndex), 0);
}
