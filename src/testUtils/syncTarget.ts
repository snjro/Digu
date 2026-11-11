import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "#constants/chains/types.js";
import type { DbEventLogs } from "#db/dbEventLogs.js";
import type {
  SyncStatusContract,
  SyncStatusesChain,
  VersionIdentifier,
} from "#db/dbTypes.js";
import { extractEventContracts } from "#utils/utilsEthers.js";

// What the tests of the sync fetch: the contracts with events of the first
// version of the first chain.
export const targetChain: Chain = TARGET_CHAINS[0];
export const targetProject: Project = targetChain.projects[0];
export const targetVersion: Version = targetProject.versions[0];
export const eventContracts: Contract[] = extractEventContracts(
  targetVersion.contracts,
);
export const targetContract: Contract = eventContracts[0];
export const versionIdentifier: VersionIdentifier = {
  chainName: targetChain.name,
  projectName: targetProject.name,
  versionName: targetVersion.name,
};
// The sync reads only the version identifier from it.
export const dbEventLogs = { versionIdentifier } as DbEventLogs;

export function contractInState(
  state: SyncStatusesChain,
  contract: Contract = targetContract,
): SyncStatusContract {
  return state[targetChain.name].subSyncStatuses[targetProject.name]
    .subSyncStatuses[targetVersion.name].subSyncStatuses[contract.name]!;
}
