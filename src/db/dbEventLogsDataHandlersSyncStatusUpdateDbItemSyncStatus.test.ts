import "fake-indexeddb/auto";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { test, type MockInstance, vi, expect, describe } from "vitest";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import type { Contract } from "@constants/chains/types";
import { extractEventContracts } from "@utils/utilsEthers";
import { updateDbItemSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbItemSyncStatus";
import * as UpdateDbRecordSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";

const syncStatusContract: SyncStatusContract = {
  creationBlockNumber: 1,
  name: "",
  subSyncStatuses: null,
  fetchedBlockNumber: 2,
  numOfSyncTargetContract: 3,
  syncStateText: "-",
  isAbort: true,
  isSyncing: true,
  isSyncTarget: true,
  events: {},
};
describe("updateDbItemSyncStatus", () => {
  const spyUpdateDbRecordSyncStatus: MockInstance = vi
    .spyOn(UpdateDbRecordSyncStatus, "updateDbRecordSyncStatus")
    .mockImplementation(vi.fn());
  test("should call updateDbRecordSyncStatus correctly", async () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };

          const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
          // extract contracts that emit eventLogs
          const eventEmittingContracts: Contract[] = extractEventContracts(
            targetVersion.contracts,
          );
          for (const targetContract of eventEmittingContracts) {
            for (const [key, value] of Object.entries(syncStatusContract)) {
              // call target
              await updateDbItemSyncStatus(
                dbEventLogs,
                targetContract.name,
                key as keyof SyncStatusContract,
                value,
              );

              expect(spyUpdateDbRecordSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                { [key]: value },
              );
            }
          }
        }
      }
    }
  });
});
