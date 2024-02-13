import "fake-indexeddb/auto";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { test, type MockInstance, vi, expect, describe } from "vitest";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import type { Contract } from "@constants/chains/types";
import { extractEventContracts } from "@utils/utilsEthers";
import { updateDbRecordSyncStatus } from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import { DB_TABLE_NAMES } from "./constants";
import { storeSyncStatus } from "@stores/storeSyncStatus";
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
describe("updateDbRecordSyncStatus", () => {
  test("should update table and store value correctly", async () => {
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
          // set spy
          const spyUpdateTable: MockInstance = vi
            .spyOn(
              dbEventLogs.table(DB_TABLE_NAMES.EventLog.syncStatus),
              "update",
            )
            .mockImplementation(vi.fn());
          const spyUpdateState: MockInstance = vi
            .spyOn(storeSyncStatus, "updateState")
            .mockImplementation(vi.fn());
          for (const targetContract of eventEmittingContracts) {
            const contractIdentifier: ContractIdentifier = {
              ...versionIdentifier,
              contractName: targetContract.name,
            };
            for (const [key, value] of Object.entries(syncStatusContract)) {
              // call target
              await updateDbRecordSyncStatus(dbEventLogs, targetContract.name, {
                [key]: value,
              });

              expect(spyUpdateTable).toBeCalledWith(targetContract.name, {
                [key]: value,
              });
              expect(spyUpdateState).toBeCalledWith(contractIdentifier, {
                [key]: value,
              });
            }
          }
        }
      }
    }
  });
});
