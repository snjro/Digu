import { getFunctionSelectorWithSplitter } from "#lib/leftSidebar/Body/functionNameHandler.js";
import type { FunctionAbiFragment } from "@constants/chains/types";
import type { FunctionRow } from "#lib/gridColumnDefs/rowTypes.js";

export const gridRows = (
  targetFunctionAbiFragments: FunctionAbiFragment[],
): FunctionRow[] => {
  const functionRows: FunctionRow[] = [];
  for (const functionAbiFragment of targetFunctionAbiFragments) {
    const functionRow: FunctionRow = {
      functionName: functionAbiFragment.name,
      functionStateMutability: functionAbiFragment.stateMutability,
      functionSelector: functionAbiFragment.selector,
      functionInputs: functionAbiFragment.inputs,
      functionOutputs: functionAbiFragment.outputs,
      functionSelectorWithSplitter:
        getFunctionSelectorWithSplitter(functionAbiFragment),
    };
    functionRows.push(functionRow);
  }
  return functionRows;
};
