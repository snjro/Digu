import type { FunctionAbiFragment } from "@constants/chains/types";

export type FunctionRow = {
  functionName: FunctionAbiFragment["name"];
  functionStateMutability: FunctionAbiFragment["stateMutability"];
  functionSelector: FunctionAbiFragment["selector"];
  functionInputs: FunctionAbiFragment["inputs"];
  functionOutputs: FunctionAbiFragment["outputs"];
};
export const gridRows = (
  targetFunctionAbiFragments: FunctionAbiFragment[],
): FunctionRow[] => {
  let functionRows: FunctionRow[] = [];
  for (const functionAbiFragment of targetFunctionAbiFragments) {
    const functionRow: FunctionRow = {
      functionName: functionAbiFragment.name,
      functionStateMutability: functionAbiFragment.stateMutability,
      functionSelector: functionAbiFragment.selector,
      functionInputs: functionAbiFragment.inputs,
      functionOutputs: functionAbiFragment.outputs,
    };
    functionRows.push(functionRow);
  }
  return functionRows;
};
