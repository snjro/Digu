import type {
  Chain,
  Contract,
  FunctionAbiFragment,
  Project,
  Version,
} from "@constants/chains/types";
import type { LoadEvent } from "@sveltejs/kit";
import { _LoadContractData, type LoadContractData } from "../+page";

export type LoadFunctionsData = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
  targetContract: Contract;
  targetFunctionAbiFragments: FunctionAbiFragment[];
};
export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadFunctionsData {
  return _loadFunctionsData({ params });
}
function _loadFunctionsData({
  params,
}: {
  params: LoadEvent["params"];
}): LoadFunctionsData {
  const loadedContractData: LoadContractData = _LoadContractData({ params });
  const targetFunctionAbiFragments: FunctionAbiFragment[] =
    loadedContractData.targetContract.functions.abiFragments;

  return { ...loadedContractData, targetFunctionAbiFragments };
}
