import { beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { getInitialState } from "./storeSyncStatusGetInitialState";
import { NO_DATA } from "@utils/utilsConstants";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";

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
    Object.assign(expectedVersion.subSyncStatuses[targetContractName1]!, {
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
    Object.assign(expectedVersion.subSyncStatuses[targetContractName2]!, {
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
  test("should sum the numbers of the sync target contracts into the parents", async () => {
    const storeSyncStatus = await importStoreSyncStatus();
    const versionIdentifier = {
      chainName: "eth",
      projectName: "Augur",
      versionName: "version2",
    } as const;
    const contractIdentifier1 = {
      ...versionIdentifier,
      contractName: "OICash",
    } as const;
    const contractIdentifier2 = {
      ...versionIdentifier,
      contractName: "AugurWalletRegistry",
    } as const;
    // Every contract is a sync target with 0 in the initial value.
    storeSyncStatus.updateState(contractIdentifier1, {
      fetchedBlockNumber: 150,
      creationBlockNumber: 100,
      numOfSyncTargetContract: 1,
    });
    storeSyncStatus.updateState(contractIdentifier2, {
      fetchedBlockNumber: 300,
      creationBlockNumber: 200,
      numOfSyncTargetContract: 1,
    });

    function parents() {
      const chain = get(storeSyncStatus)[versionIdentifier.chainName];
      const project = chain.subSyncStatuses[versionIdentifier.projectName];
      const version = project.subSyncStatuses[versionIdentifier.versionName];
      return [chain, project, version];
    }
    for (const parent of parents()) {
      expect(parent).toMatchObject({
        fetchedBlockNumber: 450,
        creationBlockNumber: 300,
        numOfSyncTargetContract: 2,
      });
    }

    // A contract that is no longer a sync target is left out of the sums.
    storeSyncStatus.updateState(contractIdentifier1, { isSyncTarget: false });
    for (const parent of parents()) {
      expect(parent).toMatchObject({
        fetchedBlockNumber: 300,
        creationBlockNumber: 200,
        numOfSyncTargetContract: 1,
      });
    }
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
    ]!.fetchedBlockNumber = 5;
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
      expectedVersion.subSyncStatuses[targetContractName]!,
    ]) {
      expectedSyncStatus.isSyncing = true;
      expectedSyncStatus.syncStateText = "syncing";
    }
    expect(get(storeSyncStatus)).toEqual(expectedSyncStatusesChain);
  });
  test("should ignore a contract that is not in the store", async () => {
    const storeSyncStatus = await importStoreSyncStatus();
    const { customLogger } = await import("@utils/logger");
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    const previousSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
    const expectedSyncStatusesChain: SyncStatusesChain = structuredClone(
      previousSyncStatusesChain,
    );
    const contractIdentifier = {
      chainName: "eth",
      projectName: "Augur",
      versionName: "version2",
      contractName: "NotInTheStore",
    } as const;

    expect(() =>
      storeSyncStatus.updateState(contractIdentifier, {
        isSyncing: true,
        fetchedBlockNumber: 5,
      }),
    ).not.toThrow();

    expect(get(storeSyncStatus)).toBe(previousSyncStatusesChain);
    expect(get(storeSyncStatus)).toEqual(expectedSyncStatusesChain);
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyError).toHaveBeenCalledWith(
      "Skip updating the sync status of a contract that is not in the store.",
      contractIdentifier,
    );
    spyError.mockRestore();
  });
  describe("updateState should not change the previous value", () => {
    const contractIdentifier = {
      chainName: "eth",
      projectName: "Augur",
      versionName: "version2",
      contractName: "OICash",
    } as const;
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isSyncTarget: false,
      isSyncing: true,
      isAbort: true,
      fetchedBlockNumber: 5,
    };

    test("the value got before updateState", async () => {
      const storeSyncStatus = await importStoreSyncStatus();
      const previousSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
      const expectedSyncStatusesChain: SyncStatusesChain = structuredClone(
        previousSyncStatusesChain,
      );

      storeSyncStatus.updateState(contractIdentifier, newSyncStatusContract);

      expect(previousSyncStatusesChain).toEqual(expectedSyncStatusesChain);
      expect(get(storeSyncStatus)).not.toBe(previousSyncStatusesChain);
    });
    test("the value passed to set", async () => {
      const storeSyncStatus = await importStoreSyncStatus();
      const syncStatusesChain: SyncStatusesChain =
        structuredClone(getInitialState());
      const expectedSyncStatusesChain: SyncStatusesChain =
        structuredClone(syncStatusesChain);

      storeSyncStatus.set(syncStatusesChain);
      storeSyncStatus.updateState(contractIdentifier, newSyncStatusContract);

      expect(syncStatusesChain).toEqual(expectedSyncStatusesChain);
    });
    test("should keep the references outside the updated path", async () => {
      const storeSyncStatus = await importStoreSyncStatus();
      const { chainName, projectName, versionName, contractName } =
        contractIdentifier;
      const previousSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
      const previousVersion =
        previousSyncStatusesChain[chainName].subSyncStatuses[projectName]
          .subSyncStatuses[versionName];

      storeSyncStatus.updateState(contractIdentifier, newSyncStatusContract);

      const currentSyncStatusesChain: SyncStatusesChain = get(storeSyncStatus);
      const currentVersion =
        currentSyncStatusesChain[chainName].subSyncStatuses[projectName]
          .subSyncStatuses[versionName];
      // The updated path gets new objects.
      expect(currentVersion).not.toBe(previousVersion);
      expect(currentVersion.subSyncStatuses[contractName]).not.toBe(
        previousVersion.subSyncStatuses[contractName],
      );
      // Sibling contracts, other versions, projects and chains keep theirs.
      for (const siblingContractName in previousVersion.subSyncStatuses) {
        if (siblingContractName === contractName) continue;
        expect(currentVersion.subSyncStatuses[siblingContractName]).toBe(
          previousVersion.subSyncStatuses[siblingContractName],
        );
      }
      for (const otherVersionName in previousSyncStatusesChain[chainName]
        .subSyncStatuses[projectName].subSyncStatuses) {
        if (otherVersionName === versionName) continue;
        expect(
          currentSyncStatusesChain[chainName].subSyncStatuses[projectName]
            .subSyncStatuses[otherVersionName],
        ).toBe(
          previousSyncStatusesChain[chainName].subSyncStatuses[projectName]
            .subSyncStatuses[otherVersionName],
        );
      }
      for (const otherProjectName in previousSyncStatusesChain[chainName]
        .subSyncStatuses) {
        if (otherProjectName === projectName) continue;
        expect(
          currentSyncStatusesChain[chainName].subSyncStatuses[otherProjectName],
        ).toBe(
          previousSyncStatusesChain[chainName].subSyncStatuses[
            otherProjectName
          ],
        );
      }
      for (const otherChainName in previousSyncStatusesChain) {
        if (otherChainName === chainName) continue;
        expect(currentSyncStatusesChain[otherChainName]).toBe(
          previousSyncStatusesChain[otherChainName],
        );
      }
    });
  });
});
