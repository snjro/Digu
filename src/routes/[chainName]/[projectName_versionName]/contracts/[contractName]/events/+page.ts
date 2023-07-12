import type {
  Chain,
  Contract,
  EventAbiFragment,
  Project,
  Version,
} from "@constants/chains/types";
import type { LoadEvent } from "@sveltejs/kit";
import { _LoadContractData, type LoadContractData } from "../+page";

export type LoadEventsData = {
  targetChain: Chain;
  targetProject: Project;
  targetVersion: Version;
  targetContract: Contract;
  targetEventAbiFragments: EventAbiFragment[];
};
export function load({
  params,
}: {
  params: LoadEvent["params"];
}): LoadEventsData | {} {
  return _loadEventsData({ params });
}
// export async function load({
//   params,
//   parent,
// }: {
//   params: LoadEvent["params"];
//   parent: LoadEvent["parent"];
// }): Promise<LoadEventsData | {}> {

//   const { initializing } = await parent();
//   if (initializing) {
//     return {};
//   } else {
//     return _loadEventsData({ params });
//   }
// }
function _loadEventsData({
  params,
}: {
  params: LoadEvent["params"];
}): LoadEventsData {
  const lodedContractData: LoadContractData = _LoadContractData({ params });
  const targetEventAbiFragments: EventAbiFragment[] =
    lodedContractData.targetContract.events.abiFragments;
  return { ...lodedContractData, targetEventAbiFragments };
}
