import type {
  Chain,
  Contract,
  EventAbiFragment,
  Project,
  Version,
} from "#constants/chains/types.js";
import type { AbiFragmentIdentifier } from "#db/dbTypes.js";
import type { LoadEvent } from "@sveltejs/kit";
import { getTargetEventAbiFragment } from "#utils/utilsDb.js";
import { _LoadContractData, type LoadContractData } from "../../+page";
import { throwNotFoundAs404 } from "#routes/targetNotFound.js";

export type LoadEventLogs = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
  targetContract: Contract;
  targetEventAbiFragment: EventAbiFragment;
  targetEventIdentifier: AbiFragmentIdentifier;
};
export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadEventLogs {
  return _loadEventData({ params });
}
function _loadEventData({
  params,
}: {
  params: LoadEvent["params"];
}): LoadEventLogs {
  const loadedContractData: LoadContractData = _LoadContractData({ params });
  const eventIdentifier: AbiFragmentIdentifier = {
    chainName: loadedContractData.targetChain.name,
    projectName: loadedContractData.targetProject.name,
    versionName: loadedContractData.targetVersion.name,
    contractName: loadedContractData.targetContract.name,
    abiFragmentName: params.eventName!,
  };

  return {
    ...loadedContractData,
    targetEventAbiFragment: throwNotFoundAs404(() =>
      getTargetEventAbiFragment(eventIdentifier),
    ),
    targetEventIdentifier: eventIdentifier,
  };
}
