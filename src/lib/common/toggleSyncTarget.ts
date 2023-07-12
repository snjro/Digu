import type {
  ChainName,
  ContractName,
  ProjectName,
  VersionName,
} from "@constants/chains/types";
import { DbEventLogs } from "@db/dbEventLogs";
import { updateDbIsSyncTarget } from "@db/dbEventLogsDataHandlersSyncStatus";
import type { SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { get } from "svelte/store";

export async function toggleIsSyncTarget<
  CH extends ChainName,
  PR extends ProjectName | undefined = undefined,
  VE extends VersionName | undefined = undefined,
  CO extends ContractName | undefined = undefined
>(
  chainName: CH,
  projectName?: PR,
  versionName?: PR extends ProjectName ? VE : undefined,
  contractName?: VE extends VersionName ? CO : undefined
): Promise<void> {
  if (projectName && versionName && contractName) {
    await toggleIsSyncTargetContract(
      chainName,
      projectName,
      versionName,
      contractName
    );
  } else if (projectName && versionName && !contractName) {
    await toggleIsSyncTargetVersion(chainName, projectName, versionName);
  } else if (projectName && !versionName && !contractName) {
    await toggleIsSyncTargetProject(chainName, projectName);
  } else {
    await toggleIsSyncTargetChain(chainName);
  }
}
async function toggleIsSyncTargetChain(chainName: ChainName) {
  const promises: Promise<void>[] = [];
  const newValue = getNewValueOfIsSyncTarget(
    get(storeSyncStatus),
    undefined,
    chainName
  );
  for (const projectName in get(storeSyncStatus)[chainName].subSyncStatuses) {
    promises.push(toggleIsSyncTargetProject(chainName, projectName, newValue));
  }
  await Promise.all(promises);
}
async function toggleIsSyncTargetProject(
  chainName: ChainName,
  projectName: ProjectName,
  newValue?: boolean
) {
  const promises: Promise<void>[] = [];
  newValue = getNewValueOfIsSyncTarget(
    get(storeSyncStatus),
    newValue,
    chainName,
    projectName
  );
  for (const versionName in get(storeSyncStatus)[chainName].subSyncStatuses[
    projectName
  ].subSyncStatuses) {
    promises.push(
      toggleIsSyncTargetVersion(chainName, projectName, versionName, newValue)
    );
  }
  await Promise.all(promises);
}
async function toggleIsSyncTargetVersion(
  chainName: ChainName,
  projectName: ProjectName,
  versionName: VersionName,
  newValue?: boolean
) {
  const promises: Promise<void>[] = [];
  newValue = getNewValueOfIsSyncTarget(
    get(storeSyncStatus),
    newValue,
    chainName,
    projectName,
    versionName
  );
  for (const contractName in get(storeSyncStatus)[chainName].subSyncStatuses[
    projectName
  ].subSyncStatuses[versionName].subSyncStatuses) {
    promises.push(
      toggleIsSyncTargetContract(
        chainName,
        projectName,
        versionName,
        contractName,
        newValue
      )
    );
  }
  await Promise.all(promises);
}
async function toggleIsSyncTargetContract(
  chainName: ChainName,
  projectName: ProjectName,
  versionName: VersionName,
  contractName: ContractName,
  newValue?: boolean
) {
  const dbEventLogs = new DbEventLogs({
    chainName: chainName,
    projectName: projectName,
    versionName: versionName,
  });
  newValue = getNewValueOfIsSyncTarget(
    get(storeSyncStatus),
    newValue,
    chainName,
    projectName,
    versionName,
    contractName
  );
  await updateDbIsSyncTarget(dbEventLogs, contractName, newValue);
}
function getNewValueOfIsSyncTarget<
  CH extends ChainName,
  PR extends ProjectName | undefined = undefined,
  VE extends VersionName | undefined = undefined,
  CO extends ContractName | undefined = undefined
>(
  syncStatuses: SyncStatusesChain,
  newValue: boolean | undefined,
  chainName: CH,
  projectName?: PR,
  versionName?: PR extends ProjectName ? VE : undefined,
  contractName?: VE extends VersionName ? CO : undefined
): boolean {
  if (newValue === undefined) {
    let currentValue: boolean = true;
    if (projectName && versionName && contractName) {
      currentValue =
        syncStatuses[chainName].subSyncStatuses[projectName].subSyncStatuses[
          versionName
        ].subSyncStatuses[contractName].isSyncTarget;
    } else if (projectName && versionName && !contractName) {
      currentValue =
        syncStatuses[chainName].subSyncStatuses[projectName].subSyncStatuses[
          versionName
        ].isSyncTarget;
    } else if (projectName && !versionName && !contractName) {
      currentValue =
        syncStatuses[chainName].subSyncStatuses[projectName].isSyncTarget;
    } else {
      currentValue = syncStatuses[chainName].isSyncTarget;
    }
    newValue = !currentValue;
  }
  return newValue;
}
