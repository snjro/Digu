import { beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { getInitialState } from "./storeSyncStatusGetInitialState";
import { NO_DATA } from "@utils/utilsCostants";
import type { SyncStatusesChain } from "@db/dbTypes";

export const dummyChainName = "chain1";
export const dummyProjectName = "project1";
export const dummyVersionName = "version1";
export const dummyContractName = "contract1";
export const dummySyncStatusesChain: SyncStatusesChain = {
  [dummyChainName]: {
    name: dummyChainName,
    isSyncTarget: false,
    isSyncing: false,
    isAbort: false,
    fetchedBlockNumber: 0,
    creationBlockNumber: 0,
    numOfSyncTargetContract: 0,
    syncStateText: NO_DATA,
    subSyncStatuses: {
      [dummyProjectName]: {
        name: dummyProjectName,
        isSyncTarget: false,
        isSyncing: false,
        isAbort: false,
        fetchedBlockNumber: 0,
        creationBlockNumber: 0,
        numOfSyncTargetContract: 0,
        syncStateText: NO_DATA,
        subSyncStatuses: {
          [dummyVersionName]: {
            name: dummyVersionName,
            isSyncTarget: false,
            isSyncing: false,
            isAbort: false,
            fetchedBlockNumber: 0,
            creationBlockNumber: 0,
            numOfSyncTargetContract: 0,
            syncStateText: NO_DATA,
            subSyncStatuses: {
              [dummyContractName]: {
                name: dummyContractName,
                isSyncTarget: false,
                isSyncing: false,
                isAbort: false,
                fetchedBlockNumber: 0,
                creationBlockNumber: 0,
                numOfSyncTargetContract: 0,
                syncStateText: NO_DATA,
                events: { event1: { recordCount: 0 } },
                subSyncStatuses: null,
              },
            },
          },
        },
      },
    },
  },
};

// Import a fresh store for each test, so that no test depends on the state
// left by another test.
async function importStoreSyncStatus() {
  return (await import("./storeSyncStatus")).storeSyncStatus;
}

describe("storeSyncStaus", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  test(`should have the initial value`, async () => {
    const storeSyncStatus = await importStoreSyncStatus();
    const currentSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
    expect(currentSyncStatusesChain).toEqual(getInitialState());
  });
  test("should set with the value of the argument passed", async () => {
    const storeSyncStatus = await importStoreSyncStatus();
    // set test data to the store by using `set`
    storeSyncStatus.set(dummySyncStatusesChain);
    const currentSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
    expect(currentSyncStatusesChain).toEqual(dummySyncStatusesChain);
  });
  test("should update state with the value passed", async () => {
    const storeSyncStatus = await importStoreSyncStatus();
    // set test data to the store by using `updateState`
    const targetChainName = "eth";
    const targetProjectName = "Augur";
    const targetVersionName = "version2";
    const targetContractName1 = "OICash";
    const targetContractName2 = "AugurWalletRegistry";
    storeSyncStatus.updateState(
      {
        chainName: targetChainName,
        projectName: targetProjectName,
        versionName: targetVersionName,
        contractName: targetContractName1,
      },
      {
        isSyncTarget: false,
        isSyncing: true,
        isAbort: true,
        fetchedBlockNumber: 1,
        creationBlockNumber: 1,
        numOfSyncTargetContract: 1,
        syncStateText: "stopped",
        events: { Approval: { recordCount: 1 }, Transfer: { recordCount: 0 } },
      },
    );

    storeSyncStatus.updateState(
      {
        chainName: targetChainName,
        projectName: targetProjectName,
        versionName: targetVersionName,
        contractName: targetContractName2,
      },
      {
        isSyncTarget: false,
        isSyncing: true,
        isAbort: false,
        fetchedBlockNumber: 1,
        creationBlockNumber: 1,
        numOfSyncTargetContract: 1,
        syncStateText: "syncing",
        events: {
          ExecuteTransactionStatus: { recordCount: 1 },
          RelayHubChanged: { recordCount: 0 },
        },
      },
    );

    const currentSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);

    // Build the expected value from a separate object, not from the store.
    const expextedSyncStatusesChain: SyncStatusesChain =
      structuredClone(getInitialState());
    const expectedChain = expextedSyncStatusesChain[targetChainName];
    const expectedProject = expectedChain.subSyncStatuses[targetProjectName];
    const expectedVersion = expectedProject.subSyncStatuses[targetVersionName];
    // chain, project and version
    for (const expectedParent of [
      expectedChain,
      expectedProject,
      expectedVersion,
    ]) {
      expectedParent.isSyncing = true;
      expectedParent.isAbort = true;
      expectedParent.syncStateText = "stopping";
    }
    // contract1
    Object.assign(expectedVersion.subSyncStatuses[targetContractName1], {
      isSyncTarget: false,
      isSyncing: true,
      isAbort: true,
      fetchedBlockNumber: 1,
      creationBlockNumber: 1,
      numOfSyncTargetContract: 1,
      syncStateText: "stopping",
      events: { Approval: { recordCount: 1 }, Transfer: { recordCount: 0 } },
    });
    // contract2
    Object.assign(expectedVersion.subSyncStatuses[targetContractName2], {
      isSyncTarget: false,
      isSyncing: true,
      isAbort: false,
      fetchedBlockNumber: 1,
      creationBlockNumber: 1,
      numOfSyncTargetContract: 1,
      syncStateText: "syncing",
      events: {
        ExecuteTransactionStatus: { recordCount: 1 },
        RelayHubChanged: { recordCount: 0 },
      },
    });

    expect(currentSyncStatusesChain).toEqual(expextedSyncStatusesChain);
  });
  test("should update the current value, not the initial value", async () => {
    const storeSyncStatus = await importStoreSyncStatus();
    const targetChainName = "eth";
    const targetProjectName = "Augur";
    const targetVersionName = "version2";
    const targetContractName = "OICash";

    // A value that differs from the initial value only in fetchedBlockNumber
    const syncStatusesChain: SyncStatusesChain =
      structuredClone(getInitialState());
    syncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].subSyncStatuses[
      targetContractName
    ].fetchedBlockNumber = 5;
    const expectedSyncStatusesChain: SyncStatusesChain =
      structuredClone(syncStatusesChain);

    storeSyncStatus.set(syncStatusesChain);
    storeSyncStatus.updateState(
      {
        chainName: targetChainName,
        projectName: targetProjectName,
        versionName: targetVersionName,
        contractName: targetContractName,
      },
      { isSyncing: true },
    );

    const expectedChain = expectedSyncStatusesChain[targetChainName];
    const expectedProject = expectedChain.subSyncStatuses[targetProjectName];
    const expectedVersion = expectedProject.subSyncStatuses[targetVersionName];
    for (const expectedSyncStatus of [
      expectedChain,
      expectedProject,
      expectedVersion,
      expectedVersion.subSyncStatuses[targetContractName],
    ]) {
      expectedSyncStatus.isSyncing = true;
      expectedSyncStatus.syncStateText = "syncing";
    }
    expect(get(storeSyncStatus)).toEqual(expectedSyncStatusesChain);
  });
});
