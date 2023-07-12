import type { LoadEvent } from "@sveltejs/kit";
import type { ContractIdentifier } from "@db/dbTypes";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import { getTargetContract } from "@utils/utlisDb";
import { _LoadVersionData, type LoadVersionData } from "../../+page";

export type LoadContractData = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
  targetContract: Contract;
};

export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadContractData {
  return _LoadContractData({ params });
}

export function _LoadContractData({
  params,
}: {
  params: LoadEvent["params"];
}): LoadContractData {
  const loadedVersionData: LoadVersionData = _LoadVersionData({ params });

  const contractIdentifier: ContractIdentifier = {
    chainName: loadedVersionData.targetChain.name,
    projectName: loadedVersionData.targetProject.name,
    versionName: loadedVersionData.targetVersion.name,
    contractName: params.contractName!,
  };
  const targetContract: Contract = getTargetContract(contractIdentifier);
  return {
    ...loadedVersionData,
    targetContract: targetContract,
  };
}
