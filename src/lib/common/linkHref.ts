import type {
  ChainName,
  ContractName,
  ProjectName,
  VersionName,
} from "@constants/chains/types";
import { DIR_NAME_CONTRACTS } from "@utils/utilsConstants";
import { getChainRootUrl } from "./chainRootUrl";
import { getProjectVersionNameForUrl } from "./projectVersionNameHelper";

export type TrailingSlashOption = "never" | "always" | "ignore";

export function getSubdirectoryHref(
  pageUrlPathname: string,
  trailingSlashOption: TrailingSlashOption,
  subdirectory: string,
): string {
  return trailingSlashOption === "always"
    ? `${pageUrlPathname}${subdirectory}`
    : `${pageUrlPathname}/${subdirectory}`;
}

export function getContractHref(
  contractsHref: string,
  contractName: ContractName,
): string {
  return `${contractsHref}/${contractName}`;
}

export function getContractHrefFromBase(
  basePath: string,
  chainName: ChainName,
  projectName: ProjectName,
  versionName: VersionName,
  contractName: ContractName,
): string {
  const contractsHref: string = `${getChainRootUrl(basePath, chainName)}/${getProjectVersionNameForUrl(projectName, versionName)}/${DIR_NAME_CONTRACTS}`;
  return getContractHref(contractsHref, contractName);
}
