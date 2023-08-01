import type {
  ContractName,
  Contract,
  Chain,
  Project,
  Version,
  AbiFragmentName,
  EventAbiFragment,
  FunctionAbiFragment,
} from "@constants/chains/types";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type {
  ChainIdentifier,
  ContractIdentifier,
  AbiFragmentIdentifier,
  ProjectIdentifier,
  VersionIdentifier,
} from "@db/dbTypes";

export function getEventLogTableName(
  contractName: ContractName,
  eventName: AbiFragmentName
): string {
  return `${contractName}_${eventName}`;
}
export function getTargetChain(chainIdentifier: ChainIdentifier): Chain {
  const targetChain: Chain | undefined = TARGET_CHAINS.find((chain) => {
    return chain.name === chainIdentifier.chainName;
  });
  return targetChain!;
}
export function getTargetProject(
  projectIdentifier: ProjectIdentifier
): Project {
  const targetProject: Project | undefined = getTargetChain({
    chainName: projectIdentifier.chainName,
  }).projects.find((project: Project) => {
    return project.name === projectIdentifier.projectName;
  });
  return targetProject!;
}
export function getTargetVersion(
  versionIdentifier: VersionIdentifier
): Version {
  const targetVersion: Version | undefined = getTargetProject({
    chainName: versionIdentifier.chainName,
    projectName: versionIdentifier.projectName,
  }).versions.find((version: Version) => {
    return version.name === versionIdentifier.versionName;
  });
  return targetVersion!;
}

export function getTargetContract(
  contractIdentifier: ContractIdentifier
): Contract {
  const targetContract: Contract | undefined = getTargetVersion({
    chainName: contractIdentifier.chainName,
    projectName: contractIdentifier.projectName,
    versionName: contractIdentifier.versionName,
  }).contracts.find((contract: Contract) => {
    return contract.name === contractIdentifier.contractName;
  });
  return targetContract!;
}
export function getTargetEventAbiFragment(
  eventIdentifier: AbiFragmentIdentifier
): EventAbiFragment {
  const targetContract: Contract = getTargetContract({
    chainName: eventIdentifier.chainName,
    projectName: eventIdentifier.projectName,
    versionName: eventIdentifier.versionName,
    contractName: eventIdentifier.contractName,
  });
  const eventAbiFragment: EventAbiFragment =
    targetContract.contractInterface.getEvent(eventIdentifier.abiFragmentName)!;

  return eventAbiFragment;
}
export function getTargetFunctionAbiFragment(
  functionIdentifier: AbiFragmentIdentifier
): FunctionAbiFragment {
  const targetContract: Contract = getTargetContract({
    chainName: functionIdentifier.chainName,
    projectName: functionIdentifier.projectName,
    versionName: functionIdentifier.versionName,
    contractName: functionIdentifier.contractName,
  });
  const functionAbiFragment: FunctionAbiFragment =
    targetContract.contractInterface.getFunction(
      functionIdentifier.functionSelector!
    )!;
  return functionAbiFragment;
}
export function getEventTableNames(targetContracts: Contract[]): string[] {
  const eventTableNames: string[] = [];

  for (const targetContract of targetContracts) {
    const eventLogTableNameInContract: string[] =
      targetContract.events.names.map((eventName: EventAbiFragment["name"]) => {
        return getEventLogTableName(targetContract.name, eventName);
      });
    eventTableNames.push(...eventLogTableNameInContract);
  }
  return eventTableNames;
}
