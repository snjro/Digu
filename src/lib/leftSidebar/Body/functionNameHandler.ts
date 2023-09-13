import type {
  EventAbiFragment,
  FunctionAbiFragment,
} from "@constants/chains/types";
import { customLogger } from "@utils/logger";

const FUNC_NAME_SPLITTER = "-";
function isFunctionAbiFragment(
  targetAbiFragment: EventAbiFragment | FunctionAbiFragment,
): targetAbiFragment is FunctionAbiFragment {
  return targetAbiFragment.type === "function";
}
export function getFunctionSelectorWithSplitter(
  targetAbiFragment: EventAbiFragment | FunctionAbiFragment,
): string {
  return isFunctionAbiFragment(targetAbiFragment)
    ? `${FUNC_NAME_SPLITTER}${targetAbiFragment.selector}` // hyphens are not allowed in function names on Solidity.
    : "";
}
export function getSplittedFunctionNameAndSelector(
  functionNameAndSelector: string,
): {
  functionName: FunctionAbiFragment["name"];
  functionSelector: FunctionAbiFragment["selector"];
} {
  const splitted: string[] = functionNameAndSelector.split(FUNC_NAME_SPLITTER);
  if (splitted.length === 2) {
    return {
      functionName: splitted[0],
      functionSelector: splitted[1],
    };
  } else {
    const errorMessage: string = `The lengh of splitted FunctionNameAndSelector should be 2.`;
    customLogger.error(
      errorMessage,
      `splitted.length: ${splitted.length}`,
      `functionNameAndSelector: ${functionNameAndSelector}`,
    );
    throw new Error(errorMessage);
  }
}
