import { writable } from "svelte/store";
import { getInitialState } from "./storeSyncStatusGetInitialState";
import {
  updateStoreSyncStatusSummarized,
  updateStoreSyncStatusSyncStateText,
} from "./storeSyncStatusUpdaters";
import type {
  ContractIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";

function store() {
  const { subscribe, set, update } = writable(getInitialState());
  const updateState = (
    contractIdentifier: ContractIdentifier,
    newSyncStatusContract: Partial<SyncStatusContract>,
  ): void => {
    update((state: SyncStatusesChain) => {
      const syncStatusContract: SyncStatusContract =
        state[contractIdentifier.chainName].subSyncStatuses[
          contractIdentifier.projectName
        ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
          contractIdentifier.contractName
        ];
      Object.assign(syncStatusContract, newSyncStatusContract);

      updateStoreSyncStatusSyncStateText(
        state,
        contractIdentifier,
        newSyncStatusContract,
      );
      updateStoreSyncStatusSummarized(
        state,
        contractIdentifier,
        newSyncStatusContract,
      );
      return state;
    });
  };
  return { subscribe, set, update, updateState };
}
export const storeSyncStatus = store();
