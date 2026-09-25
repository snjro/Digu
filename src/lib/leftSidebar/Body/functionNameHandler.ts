import type {
  EventAbiFragment,
  FunctionAbiFragment,
} from "@constants/chains/types";

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
export function getAbiFragmentHref(
  abiFragmentsHref: string,
  targetAbiFragment: EventAbiFragment | FunctionAbiFragment,
): string {
  return `${abiFragmentsHref}/${targetAbiFragment.name}${getFunctionSelectorWithSplitter(targetAbiFragment)}`;
}
// The selector is undefined when the text does not split into two, so that
// the function getter shows the 404 page for such a URL.
export function getSplittedFunctionNameAndSelector(
  functionNameAndSelector: string,
): {
  functionName: FunctionAbiFragment["name"];
  functionSelector: FunctionAbiFragment["selector"] | undefined;
} {
  const splitted: string[] = functionNameAndSelector.split(FUNC_NAME_SPLITTER);
  return {
    functionName: splitted[0],
    functionSelector: splitted.length === 2 ? splitted[1] : undefined,
  };
}
