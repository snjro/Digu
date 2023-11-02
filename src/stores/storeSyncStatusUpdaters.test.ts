import { describe, expect, test } from "vitest";
import type {
  ContractIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";
import {
  dummyChainName,
  dummyContractName,
  dummyProjectName,
  dummySyncStatusesChain,
  dummyVersionName,
} from "./storeSyncStatus.test";
import {
  updateStoreSyncStatusSummarized,
  updateStoreSyncStatusSyncStateText,
} from "./storeSyncStatusUpdaters";

describe("updateStoreSyncStatusSyncStateText", () => {
  test("should NOT update state when newSyncStatusContract has neither `isSyncing` nor `isAbort`", () => {
    let state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
    const newSyncStatusContract: Partial<SyncStatusContract> = {};
    const contractIdentifier: ContractIdentifier = {
      chainName: dummyChainName,
      projectName: dummyProjectName,
      versionName: dummyVersionName,
      contractName: dummyContractName,
    };

    updateStoreSyncStatusSyncStateText(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );
    expect(state).toEqual(dummySyncStatusesChain);
  });

  test("should update state when newSyncStatusContract has `isSyncing`", () => {
    let state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isSyncing:
        !dummySyncStatusesChain[dummyChainName].subSyncStatuses[
          dummyProjectName
        ].subSyncStatuses[dummyVersionName].subSyncStatuses[dummyContractName]
          .isSyncing,
    };
    const contractIdentifier: ContractIdentifier = {
      chainName: dummyChainName,
      projectName: dummyProjectName,
      versionName: dummyVersionName,
      contractName: dummyContractName,
    };

    updateStoreSyncStatusSyncStateText(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).not.toEqual(dummySyncStatusesChain);
  });
  test("should update state when newSyncStatusContract has `isAbort`", () => {
    let state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isAbort:
        !dummySyncStatusesChain[dummyChainName].subSyncStatuses[
          dummyProjectName
        ].subSyncStatuses[dummyVersionName].subSyncStatuses[dummyContractName]
          .isAbort,
    };
    const contractIdentifier: ContractIdentifier = {
      chainName: dummyChainName,
      projectName: dummyProjectName,
      versionName: dummyVersionName,
      contractName: dummyContractName,
    };

    updateStoreSyncStatusSyncStateText(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).not.toEqual(dummySyncStatusesChain);
  });
});

describe("updateStoreSyncStatusSummarized", () => {
  test("should NOT update state when newSyncStatusContract has neither `isSyncing` nor `isAbort`", () => {
    let state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
    const newSyncStatusContract: Partial<SyncStatusContract> = {};
    const contractIdentifier: ContractIdentifier = {
      chainName: dummyChainName,
      projectName: dummyProjectName,
      versionName: dummyVersionName,
      contractName: dummyContractName,
    };

    updateStoreSyncStatusSummarized(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );
    expect(state).toEqual(dummySyncStatusesChain);
  });

  test("should update state when newSyncStatusContract has `isSyncing`", () => {
    let state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isSyncing:
        !dummySyncStatusesChain[dummyChainName].subSyncStatuses[
          dummyProjectName
        ].subSyncStatuses[dummyVersionName].subSyncStatuses[dummyContractName]
          .isSyncing,
    };
    const contractIdentifier: ContractIdentifier = {
      chainName: dummyChainName,
      projectName: dummyProjectName,
      versionName: dummyVersionName,
      contractName: dummyContractName,
    };

    updateStoreSyncStatusSummarized(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).not.toEqual(dummySyncStatusesChain);
  });
  test("should update state when newSyncStatusContract has `isAbort`", () => {
    let state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isAbort:
        !dummySyncStatusesChain[dummyChainName].subSyncStatuses[
          dummyProjectName
        ].subSyncStatuses[dummyVersionName].subSyncStatuses[dummyContractName]
          .isAbort,
    };
    const contractIdentifier: ContractIdentifier = {
      chainName: dummyChainName,
      projectName: dummyProjectName,
      versionName: dummyVersionName,
      contractName: dummyContractName,
    };

    updateStoreSyncStatusSummarized(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).not.toEqual(dummySyncStatusesChain);
  });
});
