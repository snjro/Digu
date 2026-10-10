import {
  type ChainIdentifier,
  type ContractIdentifier,
  type ProjectIdentifier,
  type SubSyncStatuses,
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
  syncStatusBaseNumberKeys,
  syncStatusBaseBooleanKeys,
} from "#db/dbTypes.js";
import { assertIsDefined, getOwn } from "#utils/utilsCommon.js";
import type { KeysMatching } from "#utils/utilsType.js";
import { syncStateText } from "./storeSyncStatusGetInitialState";

// Called only after updateState checks that the contract is in the store.
const storeSyncStatusChain = (
  state: SyncStatusesChain,
  chainIdentifier: ChainIdentifier,
): SyncStatusChain => {
  const syncStatusChain: SyncStatusChain | undefined = getOwn(
    state,
    chainIdentifier.chainName,
  );
  assertIsDefined(syncStatusChain);
  return syncStatusChain;
};
const storeSyncStatusProject = (
  state: SyncStatusesChain,
  projectIdentifier: ProjectIdentifier,
): SyncStatusProject => {
  const syncStatusProject: SyncStatusProject | undefined = getOwn(
    storeSyncStatusChain(state, projectIdentifier).subSyncStatuses,
    projectIdentifier.projectName,
  );
  assertIsDefined(syncStatusProject);
  return syncStatusProject;
};
const storeSyncStatusVersion = (
  state: SyncStatusesChain,
  versionIdentifier: VersionIdentifier,
): SyncStatusVersion => {
  const syncStatusVersion: SyncStatusVersion | undefined = getOwn(
    storeSyncStatusProject(state, versionIdentifier).subSyncStatuses,
    versionIdentifier.versionName,
  );
  assertIsDefined(syncStatusVersion);
  return syncStatusVersion;
};
const storeSyncStatusContract = (
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
): SyncStatusContract => {
  const syncStatusContract: SyncStatusContract | undefined = getOwn(
    storeSyncStatusVersion(state, contractIdentifier).subSyncStatuses,
    contractIdentifier.contractName,
  );
  assertIsDefined(syncStatusContract);
  return syncStatusContract;
};
export function updateStoreSyncStatusSyncStateText(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
  newSyncStatusContract: Partial<SyncStatusContract>,
): void {
  if (
    "isSyncing" in newSyncStatusContract ||
    "isAbort" in newSyncStatusContract
  ) {
    const syncStatusContract: SyncStatusContract = storeSyncStatusContract(
      state,
      contractIdentifier,
    );

    Object.assign(storeSyncStatusContract(state, contractIdentifier), {
      syncStateText: syncStateText(
        syncStatusContract.isSyncing,
        syncStatusContract.isAbort,
      ),
    });
  }
}
export function updateStoreSyncStatusSummarized(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
  newSyncStatusContract: Partial<SyncStatusContract>,
): void {
  const targetSyncStatusChain: SyncStatusChain = storeSyncStatusChain(state, {
    chainName: contractIdentifier.chainName,
  });
  const targetSyncStatusProject: SyncStatusProject = storeSyncStatusProject(
    state,
    {
      chainName: contractIdentifier.chainName,
      projectName: contractIdentifier.projectName,
    },
  );
  const targetSyncStatusVersion: SyncStatusVersion = storeSyncStatusVersion(
    state,
    {
      chainName: contractIdentifier.chainName,
      projectName: contractIdentifier.projectName,
      versionName: contractIdentifier.versionName,
    },
  );

  updateStoreSyncStatusSummarizedBoolean(
    targetSyncStatusChain,
    targetSyncStatusProject,
    targetSyncStatusVersion,
    newSyncStatusContract,
  );
  updateStoreSyncStatusSummarizedNumber(
    targetSyncStatusChain,
    targetSyncStatusProject,
    targetSyncStatusVersion,
    newSyncStatusContract,
  );
  updateStoreSyncStatusSummarizedSyncStateText(
    targetSyncStatusChain,
    targetSyncStatusProject,
    targetSyncStatusVersion,
    newSyncStatusContract,
  );
}
function updateStoreSyncStatusSummarizedBoolean(
  targetSyncStatusChain: SyncStatusChain,
  targetSyncStatusProject: SyncStatusProject,
  targetSyncStatusVersion: SyncStatusVersion,
  newSyncStatus: Partial<SyncStatusContract>,
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
  newSyncStatusContract: Partial<SyncStatusContract>,
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
  newSyncStatusContract: Partial<SyncStatusContract>,
): void {
  if (
    "isSyncing" in newSyncStatusContract ||
    "isAbort" in newSyncStatusContract
  ) {
    targetSyncStatusVersion.syncStateText = syncStateText(
      targetSyncStatusVersion.isSyncing,
      targetSyncStatusVersion.isAbort,
    );
    targetSyncStatusProject.syncStateText = syncStateText(
      targetSyncStatusProject.isSyncing,
      targetSyncStatusProject.isAbort,
    );
    targetSyncStatusChain.syncStateText = syncStateText(
      targetSyncStatusChain.isSyncing,
      targetSyncStatusChain.isAbort,
    );
  }
}
