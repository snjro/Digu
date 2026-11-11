import type { SyncStatusesChain } from "#db/dbTypes.js";
import { NO_DATA } from "#utils/utilsConstants.js";

// One chain, project, version and contract, for the tests of storeSyncStatus.
export const dummyChainName = "chain1";
export const dummyProjectName = "project1";
export const dummyVersionName = "version1";
export const dummyContractName = "contract1";
const syncStatusBase = {
  isSyncTarget: false,
  isSyncing: false,
  isAbort: false,
  fetchedBlockNumber: 0,
  creationBlockNumber: 0,
  numOfSyncTargetContract: 0,
  syncStateText: NO_DATA,
} as const;
export const dummySyncStatusesChain: SyncStatusesChain = {
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
