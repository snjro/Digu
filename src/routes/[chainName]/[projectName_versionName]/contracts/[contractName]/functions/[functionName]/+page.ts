import { getSplittedFunctionNameAndSelector } from "$lib/leftSidebar/Body/ItemEventsFunctions.svelte";
import type {
  AbiFragmentName,
  Chain,
  ChainName,
  Contract,
  ContractName,
  FunctionAbiFragment,
  HexString,
  Project,
  ProjectName,
  Version,
  VersionName,
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
    const chainName: ChainName = params.chainName!;
    const projectName: ProjectName = getSplitProjectVersionName(
      params.projectName_versionName!,
    ).projectName;
    const versionName: VersionName = getSplitProjectVersionName(
      params.projectName_versionName!,
    ).versionName;
    const contractName: ContractName = params.contractName!;
    const functionName: AbiFragmentName = getSplittedFunctionNameAndSelector(
      params.functionName!,
    ).functionName;
    const functionSelector: HexString = getSplittedFunctionNameAndSelector(
      params.functionName!,
    ).functionSelector as HexString;

    const chainIdentifier: ChainIdentifier = {
      chainName: chainName,
    };
    const projectIdentifier: ProjectIdentifier = {
      ...chainIdentifier,
      projectName: projectName,
    };
    const versionIdentifier = {
      ...projectIdentifier,
      versionName: versionName,
    };
    const contractIdentifier: ContractIdentifier = {
      ...versionIdentifier,
      contractName: contractName,
    };
    const abiFragmentIdentifier: AbiFragmentIdentifier = {
      chainName: chainName,
      projectName: projectName,
      versionName: versionName,
      contractName: contractName,
      abiFragmentName: functionName,
      functionSelector: functionSelector,
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
