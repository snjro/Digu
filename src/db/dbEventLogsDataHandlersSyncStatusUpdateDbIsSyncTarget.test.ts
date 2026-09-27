import "fake-indexeddb/auto";
import { get } from "svelte/store";
import { describe, expect, test, vi } from "vitest";
import { DbEventLogs } from "./dbEventLogs";
import * as UpdateDbRecordSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import { updateDbIsSyncTarget } from "./dbEventLogsDataHandlersSyncStatusUpdateDbIsSyncTarget";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { extractEventContracts } from "@utils/utilsEthers";
import type { Contract } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "./constants";
import { storeSyncStatus } from "@stores/storeSyncStatus";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

function getStoreSyncStatusContract(
  contractIdentifier: ContractIdentifier,
): SyncStatusContract {
  const { chainName, projectName, versionName, contractName } =
    contractIdentifier;
  return get(storeSyncStatus)[chainName].subSyncStatuses[projectName]
    .subSyncStatuses[versionName].subSyncStatuses[contractName]!;
}

describe("updateDbIsSyncTarget", () => {
  const spyUpdateDbRecordSyncStatus = vi.spyOn(
    UpdateDbRecordSyncStatus,
    "updateDbRecordSyncStatus",
  );
  test("should write both fields in one call to the table and the store", async () => {
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
            const contractIdentifier: ContractIdentifier = {
              ...versionIdentifier,
              contractName: targetContract.name,
            };
            for (const newValue of [true, false]) {
              spyUpdateDbRecordSyncStatus.mockClear();
              const expected: Partial<SyncStatusContract> = {
                isSyncTarget: newValue,
                numOfSyncTargetContract: newValue ? 1 : 0,
              };

              await updateDbIsSyncTarget(
                dbEventLogs,
                targetContract.name,
                newValue,
              );

              // Both fields in one write.
              expect(spyUpdateDbRecordSyncStatus).toBeCalledTimes(1);
              expect(spyUpdateDbRecordSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                expected,
              );
              expect(
                await dbEventLogs
                  .table(tableNameSyncStatus)
                  .get(targetContract.name),
              ).toMatchObject(expected);
              expect(
                getStoreSyncStatusContract(contractIdentifier),
              ).toMatchObject(expected);
            }
          }
        }
      }
    }
  });
});
