import type {
  ContractName,
  Contract,
  Chain,
  Project,
  Version,
  AbiFragmentName,
  EventAbiFragment,
  FunctionAbiFragment,
} from "#constants/chains/types.js";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type {
  ChainIdentifier,
  ContractIdentifier,
  AbiFragmentIdentifier,
  ProjectIdentifier,
  VersionIdentifier,
} from "#db/dbTypes.js";

// The names of an identifier, from the chain down, in the order written here.
// A key of AbiFragmentIdentifier that is missing here does not compile.
const IDENTIFIER_KEYS = Object.keys({
  chainName: true,
  projectName: true,
  versionName: true,
  contractName: true,
  abiFragmentName: true,
  functionSelector: true,
} satisfies Record<
  keyof AbiFragmentIdentifier,
  true
>) as (keyof AbiFragmentIdentifier)[];
export class TargetNotFoundError extends Error {
  constructor(target: string, identifier: Partial<AbiFragmentIdentifier>) {
    // A key that is there without a value is an empty name, as the URL has it.
    const names: string[] = IDENTIFIER_KEYS.flatMap((key) =>
      key in identifier ? [identifier[key] ?? ""] : [],
    );
    super(`${target} not found: ${names.join("/")}`);
    this.name = "TargetNotFoundError";
  }
}

export function getEventLogTableName(
  contractName: ContractName,
  eventName: AbiFragmentName,
): string {
  return `${contractName}_${eventName}`;
}
export function getTargetChain(chainIdentifier: ChainIdentifier): Chain {
  const targetChain: Chain | undefined = TARGET_CHAINS.find((chain) => {
    return chain.name === chainIdentifier.chainName;
  });
  if (targetChain === undefined) {
    throw new TargetNotFoundError("chain", chainIdentifier);
  }
  return targetChain;
}
export function getTargetProject(
  projectIdentifier: ProjectIdentifier,
): Project {
  const targetProject: Project | undefined = getTargetChain({
    chainName: projectIdentifier.chainName,
  }).projects.find((project: Project) => {
    return project.name === projectIdentifier.projectName;
  });
  if (targetProject === undefined) {
    throw new TargetNotFoundError("project", projectIdentifier);
  }
  return targetProject;
}
export function getTargetVersion(
  versionIdentifier: VersionIdentifier,
): Version {
  const targetVersion: Version | undefined = getTargetProject({
    chainName: versionIdentifier.chainName,
    projectName: versionIdentifier.projectName,
  }).versions.find((version: Version) => {
    return version.name === versionIdentifier.versionName;
  });
  if (targetVersion === undefined) {
    throw new TargetNotFoundError("version", versionIdentifier);
  }
  return targetVersion;
}

export function getTargetContract(
  contractIdentifier: ContractIdentifier,
): Contract {
  const targetContract: Contract | undefined = getTargetVersion({
    chainName: contractIdentifier.chainName,
    projectName: contractIdentifier.projectName,
    versionName: contractIdentifier.versionName,
  }).contracts.find((contract: Contract) => {
    return contract.name === contractIdentifier.contractName;
  });
  if (targetContract === undefined) {
    throw new TargetNotFoundError("contract", contractIdentifier);
  }
  return targetContract;
}
export function getTargetEventAbiFragment(
  eventIdentifier: AbiFragmentIdentifier,
): EventAbiFragment {
  const targetContract: Contract = getTargetContract({
    chainName: eventIdentifier.chainName,
    projectName: eventIdentifier.projectName,
    versionName: eventIdentifier.versionName,
    contractName: eventIdentifier.contractName,
  });
  const eventAbiFragment: EventAbiFragment | null =
    targetContract.contractInterface.getEvent(eventIdentifier.abiFragmentName);
  if (eventAbiFragment === null) {
    throw new TargetNotFoundError("event", eventIdentifier);
  }
  return eventAbiFragment;
}
export function getTargetFunctionAbiFragment(
  functionIdentifier: AbiFragmentIdentifier,
): FunctionAbiFragment {
  const targetContract: Contract = getTargetContract({
    chainName: functionIdentifier.chainName,
    projectName: functionIdentifier.projectName,
    versionName: functionIdentifier.versionName,
    contractName: functionIdentifier.contractName,
  });
  const selector: string | undefined = functionIdentifier.functionSelector;
  // getFunction also looks up a name, so only a selector is passed to it.
  const functionAbiFragment: FunctionAbiFragment | null =
    selector !== undefined && /^0x[0-9a-fA-F]{8}$/.test(selector)
      ? targetContract.contractInterface.getFunction(selector)
      : null;
  if (functionAbiFragment === null) {
    throw new TargetNotFoundError("function", functionIdentifier);
  }
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
