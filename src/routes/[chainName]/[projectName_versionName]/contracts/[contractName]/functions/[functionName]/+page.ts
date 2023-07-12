import type {
  Chain,
  Contract,
  FunctionAbiFragment,
  Project,
  Version,
} from "@constants/chains/types";
import type {
  ChainIdentifier,
  ContractIdentifier,
  AbiFragmentIdentifier,
  ProjectIdentifier,
} from "@db/dbTypes";
import { getSplitProjectVersionName } from "@routes/[chainName]/[projectName_versionName]/projectVersionNameHelper";
import type { LoadEvent } from "@sveltejs/kit";
import {
  getTargetChain,
  getTargetContract,
  getTargetProject,
  getTargetVersion,
  getTargetFunctionAbiFragment,
} from "@utils/utlisDb";

export type LoadFunction = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
  targetContract: Contract;
  targetFunctionAbiFragment: FunctionAbiFragment;
};
export async function load({
  params,
  parent,
}: {
  params: LoadEvent["params"];
  parent: LoadEvent["parent"];
}): Promise<LoadFunction | {}> {
  const { initializing } = await parent();
  if (initializing) {
    return {};
  } else {
    const chainIdentifier: ChainIdentifier = {
      chainName: params.chainName!,
    };
    const projectIdentifier: ProjectIdentifier = {
      ...chainIdentifier,
      projectName: getSplitProjectVersionName(params.projectName_versionName!)
        .projectName,
    };
    const versionIdentifier = {
      ...projectIdentifier,
      versionName: getSplitProjectVersionName(params.projectName_versionName!)
        .versionName,
    };
    const contractIdentifier: ContractIdentifier = {
      ...versionIdentifier,
      contractName: params.contractName!,
    };
    const abiFragmentIdentifier: AbiFragmentIdentifier = {
      chainName: params.chainName!,
      projectName: getSplitProjectVersionName(params.projectName_versionName!)
        .projectName,
      versionName: getSplitProjectVersionName(params.projectName_versionName!)
        .versionName,
      contractName: params.contractName!,
      abiFragmentName: params.functionName!,
    };
    const targetChain: Chain = getTargetChain(chainIdentifier);
    const targetProject: Project = getTargetProject(projectIdentifier);
    const targetVersion: Version = getTargetVersion(versionIdentifier);
    const targetContract: Contract = getTargetContract(contractIdentifier);
    const targetFunctionAbiFragment: FunctionAbiFragment =
      getTargetFunctionAbiFragment(abiFragmentIdentifier);
    return {
      targetChain: targetChain,
      targetProject: targetProject,
      targetVersion: targetVersion,
      targetContract: targetContract,
      targetFunctionAbiFragment: targetFunctionAbiFragment,
    };
  }
}
