import "fake-indexeddb/auto";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { test, vi, expect, describe } from "vitest";
import { get } from "svelte/store";
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

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

function getNewSyncStatusContract(
  targetContract: Contract,
): Partial<SyncStatusContract> {
  // Different from the initial row in the table and in the store.
  return {
    isSyncTarget: false,
    isSyncing: true,
    isAbort: true,
    fetchedBlockNumber: targetContract.creation.blockNumber + 100,
  };
}
function getStoreSyncStatusContract(
  contractIdentifier: ContractIdentifier,
): SyncStatusContract {
  const { chainName, projectName, versionName, contractName } =
    contractIdentifier;
  return get(storeSyncStatus)[chainName].subSyncStatuses[projectName]
    .subSyncStatuses[versionName].subSyncStatuses[contractName]!;
}

for (const targetChain of TARGET_CHAINS) {
  for (const targetProject of targetChain.projects) {
    for (const targetVersion of targetProject.versions) {
      const versionIdentifier: VersionIdentifier = {
        chainName: targetChain.name,
        projectName: targetProject.name,
        versionName: targetVersion.name,
      };
      describe(`updateDbRecordSyncStatus: ${Object.values(versionIdentifier).join("/")}`, () => {
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
          test(`should update the table and the store of "${targetContract.name}"`, async () => {
            const contractIdentifier: ContractIdentifier = {
              ...versionIdentifier,
              contractName: targetContract.name,
            };
            const newSyncStatusContract: Partial<SyncStatusContract> =
              getNewSyncStatusContract(targetContract);

            // call target
            await updateDbRecordSyncStatus(
              dbEventLogs,
              targetContract.name,
              newSyncStatusContract,
            );

            expect(
              await dbEventLogs
                .table(tableNameSyncStatus)
                .get(targetContract.name),
            ).toMatchObject(newSyncStatusContract);
            expect(
              getStoreSyncStatusContract(contractIdentifier),
            ).toMatchObject(newSyncStatusContract);
          });
        }
      });
    }
  }
}

describe("updateDbRecordSyncStatus when the table update fails", () => {
  test("should not update the store", async () => {
    const targetChain = TARGET_CHAINS[0];
    const targetProject = targetChain.projects[0];
    const targetVersion = targetProject.versions[0];
    const targetContract: Contract = extractEventContracts(
      targetVersion.contracts,
    )[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
    };
    const contractIdentifier: ContractIdentifier = {
      ...versionIdentifier,
      contractName: targetContract.name,
    };
    const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
    const error = new Error("update failed");
    const spyUpdateTable = vi
      .spyOn(dbEventLogs.table(tableNameSyncStatus), "update")
      .mockRejectedValue(error);
    const storeSyncStatusContractBefore: SyncStatusContract =
      getStoreSyncStatusContract(contractIdentifier);

    // call target
    await expect(
      updateDbRecordSyncStatus(
        dbEventLogs,
        targetContract.name,
        getNewSyncStatusContract(targetContract),
      ),
    ).rejects.toThrow(error);

    expect(spyUpdateTable).toBeCalledTimes(1);
    expect(getStoreSyncStatusContract(contractIdentifier)).toBe(
      storeSyncStatusContractBefore,
    );
    spyUpdateTable.mockRestore();
  });
});
