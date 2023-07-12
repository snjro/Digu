import type {
  Chain,
  Contract,
  EventAbiFragment,
  Project,
  Version,
} from "@constants/chains/types";
import type { AbiFragmentIdentifier } from "@db/dbTypes";
import type { LoadEvent } from "@sveltejs/kit";
import { getTargetEventAbiFragment } from "@utils/utlisDb";
import { _LoadContractData, type LoadContractData } from "../../+page";

export type LoadEventLogs = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
  targetContract: Contract;
  targetEventAbiFragment: EventAbiFragment;
  targetEventIdentifier: AbiFragmentIdentifier;
  // targetConvertedEventLogs: ConvertedEventLog[];
};
export async function load({
  params,
  parent,
}: {
  params: LoadEvent["params"];
  parent: LoadEvent["parent"];
}): Promise<LoadEventLogs | {}> {
  const { initializing } = await parent();
  if (initializing) {
    return {};
  } else {
    return _loadEventData({ params });
  }
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
    targetEventAbiFragment: getTargetEventAbiFragment(eventIdentifier),
    targetEventIdentifier: eventIdentifier,
  };
}
