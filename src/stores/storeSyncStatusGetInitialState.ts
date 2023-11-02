import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Contract } from "@constants/chains/types";
import { getInitialDataOfSyncStatusesEvent } from "@db/dbEventLogs";
import { extractEventContracts } from "@utils/utilsEthers";
import { NO_DATA } from "@utils/utilsCostants";
import type {
  IdentifierName,
  SubSyncStatuses,
  SyncStateText,
  SyncStatusBase,
  SyncStatusChain,
  SyncStatusContract,
  SyncStatusProject,
  SyncStatusVersion,
  SyncStatusesChain,
} from "@db/dbTypes";

export function getInitialState(): SyncStatusesChain {
  const state: SyncStatusesChain = {};
  for (const targetChain of TARGET_CHAINS) {
    const syncStatusChain: SyncStatusChain = initialValueBase(
      targetChain.name,
      {},
    );

    state[targetChain.name] = syncStatusChain;

    for (const targetProject of targetChain.projects) {
      const syncStatusProject: SyncStatusProject = initialValueBase(
        targetProject.name,
        {},
      );

      state[targetChain.name].subSyncStatuses[targetProject.name] =
        syncStatusProject;

      for (const targetVersion of targetProject.versions) {
        const syncStatusVersion: SyncStatusVersion = initialValueBase(
          targetVersion.name,
          {},
        );

        state[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name] = syncStatusVersion;

        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
          const syncStatusContract: SyncStatusContract =
            getInitialValueContract(targetContract);

          state[targetChain.name].subSyncStatuses[
            targetProject.name
          ].subSyncStatuses[targetVersion.name].subSyncStatuses[
            targetContract.name
          ] = syncStatusContract;
        }
      }
    }
  }
  return state;
}
const initialValueBase = <T extends IdentifierName, U extends SubSyncStatuses>(
  name: T,
  subSyncStatuses: U,
): SyncStatusBase<T, U> => {
  const isSyncing: boolean = false;
  const isAbort: boolean = false;
  return {
    name: name,
    isSyncTarget: true,
    isSyncing: isSyncing,
    isAbort: isAbort,
    fetchedBlockNumber: 0,
    creationBlockNumber: 0,
    numOfSyncTargetContract: 0,
    syncStateText: syncStateText(isSyncing, isAbort),
    subSyncStatuses: subSyncStatuses,
  };
};
export const syncStateText = (
  isSyncing: boolean,
  isAbort: boolean,
): SyncStateText => {
  if (isSyncing) {
    if (isAbort) {
      return "stopping";
    } else {
      return "syncing";
    }
  } else {
    if (isAbort) {
      return NO_DATA;
    } else {
      return "stopped";
    }
  }
};
function getInitialValueContract(targetContract: Contract): SyncStatusContract {
  return {
    ...initialValueBase(targetContract.name, null),
    events: getInitialDataOfSyncStatusesEvent(targetContract.events.names),
  };
}
