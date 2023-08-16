import {
  type ChainIdentifier,
  type ContractIdentifier,
  type IdentifierName,
  type ProjectIdentifier,
  type SubSyncStatuses,
  type SyncStatusBase,
  type SyncStatusesChain,
  type SyncStatusesContract,
  type SyncStatusesProject,
  type SyncStatusesVersion,
  type VersionIdentifier,
  type SyncStatusContract,
  type SyncStatusChain,
  type SyncStatusProject,
  type SyncStatusVersion,
  type SubSyncStatus,
  type SyncStateText,
  syncStatusBaseNumberKeys,
  syncStatusBaseBooleanKeys,
} from "@db/dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { assertIsDefined } from "@utils/utilsCommon";
import type { Contract } from "@constants/chains/types";
import { getInitialDataOfSyncStatusesEvent } from "@db/dbEventLogs";
import { writable } from "svelte/store";
import type { KeysMatching } from "@utils/utilsType";
import { extractEventContracts } from "@utils/utilsEthers";
import { NO_DATA } from "@utils/utilsCostants";

function store() {
  const state: SyncStatusesChain = getInitialState();
  const { subscribe, set, update } = writable(state);
  const updateState = (
    contractIdentifier: ContractIdentifier,
    newSyncStatusContract: Partial<SyncStatusContract>
  ): void => {
    Object.assign(
      getStoreSyncStatusContract(state, contractIdentifier),
      newSyncStatusContract
    );
    updateStoreSyncStatusSyncStateText(
      state,
      contractIdentifier,
      newSyncStatusContract
    );
    updateStoreSyncStatusSummarized(
      state,
      contractIdentifier,
      newSyncStatusContract
    );
    // update((newState) => newState);
    set(state);
  };
  return { subscribe, set, update, updateState };
}
export const storeSyncStatus = store();

function getInitialState(): SyncStatusesChain {
  const state: SyncStatusesChain = {};
  for (const targetChain of TARGET_CHAINS) {
    const syncStatusChain: SyncStatusChain = getInitialValueBase(
      targetChain.name,
      {}
    );

    state[targetChain.name] = syncStatusChain;

    for (const targetProject of targetChain.projects) {
      const syncStatusProject: SyncStatusProject = getInitialValueBase(
        targetProject.name,
        {}
      );

      state[targetChain.name].subSyncStatuses[targetProject.name] =
        syncStatusProject;

      for (const targetVersion of targetProject.versions) {
        const syncStatusVersion: SyncStatusVersion = getInitialValueBase(
          targetVersion.name,
          {}
        );

        state[targetChain.name].subSyncStatuses[
          targetProject.name
        ].subSyncStatuses[targetVersion.name] = syncStatusVersion;

        for (const targetContract of extractEventContracts(
          targetVersion.contracts
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
function getInitialValueBase<
  T extends IdentifierName,
  U extends SubSyncStatuses,
>(name: T, subSyncStatuses: U): SyncStatusBase<T, U> {
  const isSyncing: boolean = true;
  const isAbort: boolean = true;
  return {
    name: name,
    isSyncTarget: true,
    isSyncing: isSyncing,
    isAbort: isAbort,
    fetchedBlockNumber: 0,
    creationBlockNumber: 0,
    numOfSyncTargetContract: 0,
    syncStateText: getSyncStateText(isSyncing, isAbort),
    subSyncStatuses: subSyncStatuses,
  };
}
function getSyncStateText(isSyncing: boolean, isAbort: boolean): SyncStateText {
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
}
function getInitialValueContract(targetContract: Contract): SyncStatusContract {
  return {
    ...getInitialValueBase(targetContract.name, null),
    events: getInitialDataOfSyncStatusesEvent(targetContract.events.names),
  };
}

function getStoreSyncStatusChain(
  state: SyncStatusesChain,
  chainIdentifier: ChainIdentifier
): SyncStatusChain {
  return state[chainIdentifier.chainName];
}
function getStoreSyncStatusProject(
  state: SyncStatusesChain,
  projectIdentifier: ProjectIdentifier
): SyncStatusProject {
  return state[projectIdentifier.chainName].subSyncStatuses[
    projectIdentifier.projectName
  ];
}
function getStoreSyncStatusVersion(
  state: SyncStatusesChain,
  versionIdentifier: VersionIdentifier
): SyncStatusVersion {
  return state[versionIdentifier.chainName].subSyncStatuses[
    versionIdentifier.projectName
  ].subSyncStatuses[versionIdentifier.versionName];
}
function getStoreSyncStatusContract(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier
): SyncStatusContract {
  return state[contractIdentifier.chainName].subSyncStatuses[
    contractIdentifier.projectName
  ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
    contractIdentifier.contractName
  ];
}
function updateStoreSyncStatusSyncStateText(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
  newSyncStatusContract: Partial<SyncStatusContract>
): void {
  if (
    "isSyncing" in newSyncStatusContract ||
    "isAbort" in newSyncStatusContract
  ) {
    const syncStatusContract: SyncStatusContract = getStoreSyncStatusContract(
      state,
      contractIdentifier
    );

    const syncStateText = getSyncStateText(
      syncStatusContract.isSyncing,
      syncStatusContract.isAbort
    );
    Object.assign(getStoreSyncStatusContract(state, contractIdentifier), {
      syncStateText: syncStateText,
    });
  }
}
function updateStoreSyncStatusSummarized(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
  newSyncStatusContract: Partial<SyncStatusContract>
): void {
  const targetSyncStatusChain: SyncStatusChain = getStoreSyncStatusChain(
    state,
    {
      chainName: contractIdentifier.chainName,
    }
  );
  const targetSyncStatusProject: SyncStatusProject = getStoreSyncStatusProject(
    state,
    {
      chainName: contractIdentifier.chainName,
      projectName: contractIdentifier.projectName,
    }
  );
  const targetSyncStatusVersion: SyncStatusVersion = getStoreSyncStatusVersion(
    state,
    {
      chainName: contractIdentifier.chainName,
      projectName: contractIdentifier.projectName,
      versionName: contractIdentifier.versionName,
    }
  );

  updateStoreSyncStatusSummarizedBoolean(
    targetSyncStatusChain,
    targetSyncStatusProject,
    targetSyncStatusVersion,
    newSyncStatusContract
  );
  updateStoreSyncStatusSummarizedNumber(
    targetSyncStatusChain,
    targetSyncStatusProject,
    targetSyncStatusVersion,
    newSyncStatusContract
  );
  updateStoreSyncStatusSummarizedSyncStateText(
    targetSyncStatusChain,
    targetSyncStatusProject,
    targetSyncStatusVersion,
    newSyncStatusContract
  );
}
function updateStoreSyncStatusSummarizedBoolean(
  targetSyncStatusChain: SyncStatusChain,
  targetSyncStatusProject: SyncStatusProject,
  targetSyncStatusVersion: SyncStatusVersion,
  newSyncStatus: Partial<SyncStatusContract>
): void {
  for (const key of syncStatusBaseBooleanKeys) {
    if (key in newSyncStatus) {
      targetSyncStatusVersion[key] = isAnyOneOfSubSyncStatusTrue<
        SyncStatusesContract,
        SyncStatusContract,
        typeof key
      >(targetSyncStatusVersion.subSyncStatuses, key);

      targetSyncStatusProject[key] = isAnyOneOfSubSyncStatusTrue<
        SyncStatusesVersion,
        SyncStatusVersion,
        typeof key
      >(targetSyncStatusProject.subSyncStatuses, key);

      targetSyncStatusChain[key] = isAnyOneOfSubSyncStatusTrue<
        SyncStatusesProject,
        SyncStatusProject,
        typeof key
      >(targetSyncStatusChain.subSyncStatuses, key);
    }
  }
}
type booleanKeysInSubSyncStatus<T extends SubSyncStatus> = KeysMatching<
  T,
  boolean
>;
function isAnyOneOfSubSyncStatusTrue<
  T extends SubSyncStatuses,
  U extends SubSyncStatus,
  K extends booleanKeysInSubSyncStatus<U>,
>(subSyncStatuses: T, key: K): boolean {
  assertIsDefined(subSyncStatuses);
  for (const subSyncStatus of Object.values(subSyncStatuses)) {
    if (subSyncStatus[key]) {
      return true;
    }
  }
  return false;
}
type NumberKeysInSubSyncStatus<T extends SubSyncStatus> = KeysMatching<
  T,
  number
>;
function updateStoreSyncStatusSummarizedNumber(
  targetSyncStatusChain: SyncStatusChain,
  targetSyncStatusProject: SyncStatusProject,
  targetSyncStatusVersion: SyncStatusVersion,
  newSyncStatusContract: Partial<SyncStatusContract>
): void {
  for (const key of syncStatusBaseNumberKeys) {
    if (
      key in newSyncStatusContract ||
      "isSyncTarget" in newSyncStatusContract
    ) {
      targetSyncStatusVersion[key] = accumulateSubSyncStatus<
        SyncStatusesContract,
        SyncStatusContract,
        typeof key
      >(targetSyncStatusVersion.subSyncStatuses, key);

      targetSyncStatusProject[key] = accumulateSubSyncStatus<
        SyncStatusesVersion,
        SyncStatusVersion,
        typeof key
      >(targetSyncStatusProject.subSyncStatuses, key);

      targetSyncStatusChain[key] = accumulateSubSyncStatus<
        SyncStatusesProject,
        SyncStatusProject,
        typeof key
      >(targetSyncStatusChain.subSyncStatuses, key);
    }
  }
}
function accumulateSubSyncStatus<
  T extends SubSyncStatuses,
  U extends SubSyncStatus,
  K extends NumberKeysInSubSyncStatus<U>,
>(subSyncStatuses: T, key: K): number {
  let accumulateValue = 0;
  assertIsDefined(subSyncStatuses);
  for (const subSyncStatus of Object.values(subSyncStatuses)) {
    if (subSyncStatus.isSyncTarget) {
      accumulateValue += subSyncStatus[key];
    }
  }
  return accumulateValue;
}
function updateStoreSyncStatusSummarizedSyncStateText(
  targetSyncStatusChain: SyncStatusChain,
  targetSyncStatusProject: SyncStatusProject,
  targetSyncStatusVersion: SyncStatusVersion,
  newSyncStatusContract: Partial<SyncStatusContract>
): void {
  if (
    "isSyncing" in newSyncStatusContract ||
    "isAbort" in newSyncStatusContract
  ) {
    targetSyncStatusVersion.syncStateText = getSyncStateText(
      targetSyncStatusVersion.isSyncing,
      targetSyncStatusVersion.isAbort
    );
    targetSyncStatusProject.syncStateText = getSyncStateText(
      targetSyncStatusProject.isSyncing,
      targetSyncStatusProject.isAbort
    );
    targetSyncStatusChain.syncStateText = getSyncStateText(
      targetSyncStatusChain.isSyncing,
      targetSyncStatusChain.isAbort
    );
  }
}
