import { writable } from "svelte/store";
import { getInitialState } from "./storeSyncStatusGetInitialState";
import {
  updateStoreSyncStatusSummarized,
  updateStoreSyncStatusSyncStateText,
} from "./storeSyncStatusUpdaters";
import type {
  ContractIdentifier,
  SyncStatusChain,
  SyncStatusContract,
  SyncStatusesChain,
  SyncStatusProject,
  SyncStatusVersion,
} from "@db/dbTypes";
import { customLogger } from "@utils/logger";

function store() {
  const { subscribe, set, update } = writable(getInitialState());
  const updateState = (
    contractIdentifier: ContractIdentifier,
    newSyncStatusContract: Partial<SyncStatusContract>,
  ): void => {
    update((state: SyncStatusesChain) => {
      const contract: SyncStatusContract | undefined = getContractInState(
        state,
        contractIdentifier,
      );
      // Adding the contract would count it in the summarized statuses.
      if (!contract) {
        customLogger.error(
          "Skip updating the sync status of a contract that is not in the store.",
          contractIdentifier,
        );
        return state;
      }
      const newState: SyncStatusesChain = copyPath(
        state,
        contractIdentifier,
        contract,
        newSyncStatusContract,
      );
      // The updaters change only the objects on the path, which are copies.
      updateStoreSyncStatusSyncStateText(
        newState,
        contractIdentifier,
        newSyncStatusContract,
      );
      updateStoreSyncStatusSummarized(
        newState,
        contractIdentifier,
        newSyncStatusContract,
      );
      return newState;
    });
  };
  return { subscribe, set, update, updateState };
}
export const storeSyncStatus = store();

function getContractInState(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
): SyncStatusContract | undefined {
  const { chainName, projectName, versionName, contractName } =
    contractIdentifier;
  return state[chainName]?.subSyncStatuses[projectName]?.subSyncStatuses[
    versionName
  ]?.subSyncStatuses[contractName];
}

// Copy the chain, project, version and contract on the path, and merge the
// new status into the contract. Keep the other objects as they are.
function copyPath(
  state: SyncStatusesChain,
  contractIdentifier: ContractIdentifier,
  contract: SyncStatusContract,
  newSyncStatusContract: Partial<SyncStatusContract>,
): SyncStatusesChain {
  const { chainName, projectName, versionName, contractName } =
    contractIdentifier;
  const chain: SyncStatusChain = state[chainName];
  const project: SyncStatusProject = chain.subSyncStatuses[projectName];
  const version: SyncStatusVersion = project.subSyncStatuses[versionName];
  return {
    ...state,
    [chainName]: {
      ...chain,
      subSyncStatuses: {
        ...chain.subSyncStatuses,
        [projectName]: {
          ...project,
          subSyncStatuses: {
            ...project.subSyncStatuses,
            [versionName]: {
              ...version,
              subSyncStatuses: {
                ...version.subSyncStatuses,
                [contractName]: { ...contract, ...newSyncStatusContract },
              },
            },
          },
        },
      },
    },
  };
}
