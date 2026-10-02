import type { LoadEvent } from "@sveltejs/kit";
import type { ContractIdentifier } from "#db/dbTypes.js";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "#constants/chains/types.js";
import { getTargetContract } from "#utils/utilsDb.js";
import { _LoadVersionData, type LoadVersionData } from "../../+page";
import { throwNotFoundAs404 } from "#routes/targetNotFound.js";

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
  const targetContract: Contract = throwNotFoundAs404(() =>
    getTargetContract(contractIdentifier),
  );
  return {
    ...loadedVersionData,
    targetContract: targetContract,
  };
}
