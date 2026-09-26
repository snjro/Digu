import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type {
  SubSyncStatus,
  SubSyncStatuses,
  SyncStatus,
  SyncStatusesChain,
} from "@db/dbTypes";

export const isSyncTargetIndeterminate = (
  subSyncStatuses: SubSyncStatuses,
): boolean => {
  if (subSyncStatuses) {
    const targetSubSyncStatusValues: SubSyncStatus[] =
      Object.values(subSyncStatuses);
    const isAllSubSyncStatusValuesSame: boolean =
      targetSubSyncStatusValues.every(
        (targetSubSyncStatusValue: SubSyncStatus) => {
          return (
            targetSubSyncStatusValue.isSyncTarget ===
            targetSubSyncStatusValues[0].isSyncTarget
          );
        },
      );
    return !isAllSubSyncStatusValuesSame;
  } else {
    return false;
  }
};

export type SyncTargetLabelText =
  "Partially" | "All" | "Nothing" | "Yes" | "No";
export const syncTargetLabelText = (
  targetSyncStatus: SyncStatus,
): SyncTargetLabelText => {
  if (targetSyncStatus.subSyncStatuses) {
    if (isSyncTargetIndeterminate(targetSyncStatus.subSyncStatuses)) {
      return "Partially";
    } else {
      return targetSyncStatus.isSyncTarget ? "All" : "Nothing";
    }
  } else {
    return targetSyncStatus.isSyncTarget ? "Yes" : "No";
  }
};

export const getTargetSyncStatus = <
  CH extends Chain,
  PR extends Project | undefined = undefined,
  VE extends Version | undefined = undefined,
  CO extends Contract | undefined = undefined,
>(
  syncStatuses: SyncStatusesChain,
  targetChain: CH,
  targetProject?: PR,
  targetVersion?: PR extends Project ? VE : undefined,
  targetContract?: VE extends Version ? CO : undefined,
): SyncStatus | undefined => {
  if (targetProject && targetVersion && targetContract) {
    return syncStatuses[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name].subSyncStatuses[targetContract.name];
  } else if (targetProject && targetVersion && !targetContract) {
    return syncStatuses[targetChain.name].subSyncStatuses[targetProject.name]
      .subSyncStatuses[targetVersion.name];
  } else if (targetProject && !targetVersion && !targetContract) {
    return syncStatuses[targetChain.name].subSyncStatuses[targetProject.name];
  } else {
    return syncStatuses[targetChain.name];
  }
};
