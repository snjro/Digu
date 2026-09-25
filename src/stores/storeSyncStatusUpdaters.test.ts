import { describe, expect, test } from "vitest";
import type {
  ContractIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";
import { NO_DATA } from "@utils/utilsConstants";
import {
  updateStoreSyncStatusSummarized,
  updateStoreSyncStatusSyncStateText,
} from "./storeSyncStatusUpdaters";

const dummyChainName = "chain1";
const dummyProjectName = "project1";
const dummyVersionName = "version1";
const dummyContractName = "contract1";
const syncStatusBase = {
  isSyncTarget: false,
  isSyncing: false,
  isAbort: false,
  fetchedBlockNumber: 0,
  creationBlockNumber: 0,
  numOfSyncTargetContract: 0,
  syncStateText: NO_DATA,
} as const;
const dummySyncStatusesChain: SyncStatusesChain = {
  [dummyChainName]: {
    ...syncStatusBase,
    name: dummyChainName,
    subSyncStatuses: {
      [dummyProjectName]: {
        ...syncStatusBase,
        name: dummyProjectName,
        subSyncStatuses: {
          [dummyVersionName]: {
            ...syncStatusBase,
            name: dummyVersionName,
            subSyncStatuses: {
              [dummyContractName]: {
                ...syncStatusBase,
                name: dummyContractName,
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
const contractIdentifier: ContractIdentifier = {
  chainName: dummyChainName,
  projectName: dummyProjectName,
  versionName: dummyVersionName,
  contractName: dummyContractName,
};

// Returns the chain, project, version and contract statuses of the state.
function levels(state: SyncStatusesChain) {
  const chain = state[dummyChainName];
  const project = chain.subSyncStatuses[dummyProjectName];
  const version = project.subSyncStatuses[dummyVersionName];
  const contract = version.subSyncStatuses[dummyContractName];
  return { chain, project, version, contract };
}

// storeSyncStatus.updateState assigns the new values to the contract
// before calling the updaters. Do the same here.
function stateWithContract(
  newSyncStatusContract: Partial<SyncStatusContract>,
): SyncStatusesChain {
  const state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);
  Object.assign(levels(state).contract, newSyncStatusContract);
  return state;
}

describe("updateStoreSyncStatusSyncStateText", () => {
  test("should NOT update state when newSyncStatusContract has neither `isSyncing` nor `isAbort`", () => {
    const state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);

    updateStoreSyncStatusSyncStateText(state, contractIdentifier, {});

    expect(state).toEqual(dummySyncStatusesChain);
  });

  test("should update state when newSyncStatusContract has `isSyncing`", () => {
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isSyncing: true,
    };
    const state: SyncStatusesChain = stateWithContract(newSyncStatusContract);
    const expected: SyncStatusesChain = structuredClone(state);
    levels(expected).contract.syncStateText = "syncing";

    updateStoreSyncStatusSyncStateText(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).toEqual(expected);
  });
  test("should update state when newSyncStatusContract has `isAbort`", () => {
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isAbort: true,
    };
    const state: SyncStatusesChain = stateWithContract({
      isSyncing: true,
      ...newSyncStatusContract,
    });
    const expected: SyncStatusesChain = structuredClone(state);
    levels(expected).contract.syncStateText = "stopping";

    updateStoreSyncStatusSyncStateText(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).toEqual(expected);
  });
});

describe("updateStoreSyncStatusSummarized", () => {
  test("should NOT update state when newSyncStatusContract is empty", () => {
    const state: SyncStatusesChain = structuredClone(dummySyncStatusesChain);

    updateStoreSyncStatusSummarized(state, contractIdentifier, {});

    expect(state).toEqual(dummySyncStatusesChain);
  });

  test("should update state when newSyncStatusContract has `isSyncing`", () => {
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isSyncing: true,
    };
    const state: SyncStatusesChain = stateWithContract(newSyncStatusContract);
    const expected: SyncStatusesChain = structuredClone(state);
    const { chain, project, version } = levels(expected);
    for (const syncStatus of [chain, project, version]) {
      syncStatus.isSyncing = true;
      syncStatus.syncStateText = "syncing";
    }

    updateStoreSyncStatusSummarized(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).toEqual(expected);
  });
  test("should update state when newSyncStatusContract has `isAbort`", () => {
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isAbort: true,
    };
    // the contract is syncing, and the upper levels already know it
    const state: SyncStatusesChain = stateWithContract({
      isSyncing: true,
      ...newSyncStatusContract,
    });
    for (const syncStatus of Object.values(levels(state))) {
      syncStatus.isSyncing = true;
    }
    const expected: SyncStatusesChain = structuredClone(state);
    const { chain, project, version } = levels(expected);
    for (const syncStatus of [chain, project, version]) {
      syncStatus.isAbort = true;
      syncStatus.syncStateText = "stopping";
    }

    updateStoreSyncStatusSummarized(
      state,
      contractIdentifier,
      newSyncStatusContract,
    );

    expect(state).toEqual(expected);
  });

  describe("numbers of the parents", () => {
    const dummyContractName2 = "contract2";
    const newSyncStatusContract: Partial<SyncStatusContract> = {
      isSyncTarget: true,
      fetchedBlockNumber: 150,
      creationBlockNumber: 100,
      numOfSyncTargetContract: 1,
    };
    // contract1 gets newSyncStatusContract. contract2 is already synced to 300.
    function stateWithTwoContracts(
      isSyncTargetOfContract2: boolean,
    ): SyncStatusesChain {
      const state: SyncStatusesChain = stateWithContract(newSyncStatusContract);
      const { version, contract } = levels(state);
      version.subSyncStatuses[dummyContractName2] = {
        ...contract,
        name: dummyContractName2,
        isSyncTarget: isSyncTargetOfContract2,
        fetchedBlockNumber: 300,
        creationBlockNumber: 200,
        numOfSyncTargetContract: 1,
      };
      return state;
    }

    test("should sum the numbers of the sync target contracts", () => {
      const state: SyncStatusesChain = stateWithTwoContracts(true);

      updateStoreSyncStatusSummarized(
        state,
        contractIdentifier,
        newSyncStatusContract,
      );

      const { chain, project, version } = levels(state);
      for (const syncStatus of [chain, project, version]) {
        expect(syncStatus).toMatchObject({
          isSyncTarget: true,
          fetchedBlockNumber: 450,
          creationBlockNumber: 300,
          numOfSyncTargetContract: 2,
        });
      }
    });
    test("should leave out the numbers of a contract that is not a sync target", () => {
      const state: SyncStatusesChain = stateWithTwoContracts(false);

      updateStoreSyncStatusSummarized(
        state,
        contractIdentifier,
        newSyncStatusContract,
      );

      const { chain, project, version } = levels(state);
      for (const syncStatus of [chain, project, version]) {
        expect(syncStatus).toMatchObject({
          isSyncTarget: true,
          fetchedBlockNumber: 150,
          creationBlockNumber: 100,
          numOfSyncTargetContract: 1,
        });
      }
    });
  });
});
