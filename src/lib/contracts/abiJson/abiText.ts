import type {
  AbiFragmentParam,
  ContractInterface,
  EventAbiFragment,
  FunctionAbiFragment,
} from "#constants/chains/types.js";
import type { JsonFragment } from "ethers";
import { jsonStringifyFormatted } from "#utils/utilsCommon.js";
import { NO_DATA } from "#utils/utilsConstants.js";
import type { AbiFormatType } from "#utils/utilsEthers.js";

export type TargetAbi =
  ContractInterface | EventAbiFragment | FunctionAbiFragment;

export function isTargetContractInterface(
  targetAbi: TargetAbi,
): targetAbi is ContractInterface {
  return Object.prototype.hasOwnProperty.call(targetAbi, "fragments");
}

// ethers writes the string "undefined" for a constructor that is not payable.
function fixConstructorStateMutability(fragment: JsonFragment): JsonFragment {
  return fragment.type === "constructor" &&
    fragment.stateMutability === "undefined"
    ? { ...fragment, stateMutability: "nonpayable" }
    : fragment;
}

export function formatTargetAbi(
  targetAbi: TargetAbi,
  abiFormat: AbiFormatType,
) {
  switch (abiFormat) {
    case "json": // The standard ABI JSON, without the fields that only ethers has
      return isTargetContractInterface(targetAbi)
        ? (JSON.parse(targetAbi.formatJson()) as JsonFragment[]).map(
            fixConstructorStateMutability,
          )
        : (JSON.parse(targetAbi.format("json")) as JsonFragment);
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

// The params of the grid and of the table of the dialog.
export type AbiParamField = "name" | "type" | "indexed";
export function getAbiParamText(
  abiParam: AbiFragmentParam | undefined,
  field: AbiParamField,
): string {
  if (!abiParam) return NO_DATA;
  // Only the inputs of an event show it. For an input that is not indexed,
  // ethers gives null from a human readable ABI, and undefined from a JSON ABI
  // without the key.
  if (field === "indexed") return String(abiParam.indexed === true);
  // ethers gives an unnamed param the name "".
  return abiParam[field] === "" ? NO_DATA : abiParam[field];
}
export function getComponentsFromAbiFragmentParam(
  abiFragmentParam: AbiFragmentParam | undefined,
): readonly AbiFragmentParam[] | undefined {
  if (!abiFragmentParam) return undefined;
  if (abiFragmentParam.components !== null) return abiFragmentParam.components;
  if (abiFragmentParam.arrayChildren !== null)
    return getComponentsFromAbiFragmentParam(abiFragmentParam.arrayChildren);
  return undefined;
}
// The standard ABI JSON of the components of a param, without the fields that
// only ethers has (baseType, arrayChildren, ...), like the "json" format above.
export function getComponentsJsonText(
  components: readonly AbiFragmentParam[],
  isExpanded: boolean,
): string {
  return isExpanded
    ? jsonStringifyFormatted(
        components.map((component): unknown =>
          JSON.parse(component.format("json")),
        ),
      )
    : `[${components.map((component) => component.format("json")).join(",")}]`;
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
