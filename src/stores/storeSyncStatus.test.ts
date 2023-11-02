import { describe, expect, test } from "vitest";
import { get } from "svelte/store";
import { getInitialState } from "./storeSyncStatusGetInitialState";
import { storeSyncStatus } from "./storeSyncStatus";
import { NO_DATA } from "@utils/utilsCostants";
import type { SyncStatusesChain } from "@db/dbTypes";

const dummyChainName = "chain1";
const dummyProjectName = "project1";
const dummyVersionName = "version1";
const dummyContractName = "contract1";
const dummySyncStatusesChain: SyncStatusesChain = {
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

describe("storeSyncStaus", () => {
  test(`should have the initial value`, () => {
    const currentSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
    expect(currentSyncStatusesChain).toEqual(getInitialState());
  });
  test("should set with the value of the argument passed", () => {
    // set test data to the store by using `set`
    storeSyncStatus.set(dummySyncStatusesChain);
    const currentSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
    expect(currentSyncStatusesChain).toEqual(dummySyncStatusesChain);
  });
  test("should update state with the value passed", () => {
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

    let expextedSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
    // chain
    expextedSyncStatusesChain[targetChainName].isSyncing = true;
    expextedSyncStatusesChain[targetChainName].isAbort = true;
    // project
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].isSyncing = true;
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].isAbort = true;
    // version
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].isSyncing = true;
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].isAbort = true;
    // contract1
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].subSyncStatuses[
      targetContractName1
    ].isSyncing = true;
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].subSyncStatuses[
      targetContractName1
    ].isAbort = true;
    // contract2
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].subSyncStatuses[
      targetContractName2
    ].isSyncing = true;
    expextedSyncStatusesChain[targetChainName].subSyncStatuses[
      targetProjectName
    ].subSyncStatuses[targetVersionName].subSyncStatuses[
      targetContractName2
    ].isAbort = true;

    expect(currentSyncStatusesChain).toEqual(expextedSyncStatusesChain);
  });
});
