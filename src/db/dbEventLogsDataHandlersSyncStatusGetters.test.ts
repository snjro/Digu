import { TARGET_CHAINS } from "@constants/chains/_index";
import "fake-indexeddb/auto";
import {
  beforeEach,
  describe,
  vi,
  type MockInstance,
  test,
  expect,
} from "vitest";
import { isDeepStrictEqual } from "node:util";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import {
  getDbRecordSyncStatusContract,
  getDbRecordsSyncStatusContractByKeyValue,
  getDbItemSyncStatus,
} from "./dbEventLogsDataHandlersSyncStatusGetters";

import { DB_TABLE_NAMES } from "./constants";
import type { Contract } from "@constants/chains/types";
import { extractEventContracts } from "@utils/utilsEthers";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

describe("getDbRecordSyncStatusContract", async () => {
  for (const targetChain of TARGET_CHAINS) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
        const spyTransaction: MockInstance = vi.spyOn(
          dbEventLogs,
          "transaction",
        );
        const spyGet: MockInstance = vi.spyOn(
          dbEventLogs.table(tableNameSyncStatus),
          "get",
        );
        // extract contracts that emit eventLogs
        // extract contracts that emit eventLogs
        const eventEmittingContracts: Contract[] = extractEventContracts(
          targetVersion.contracts,
        );

        for (const targetContract of eventEmittingContracts) {
          describe(`chainName:${targetChain.name}, projectName:${targetProject.name}, versionName:${targetVersion.name}, contractName:${targetContract.name}`, async () => {
            let actualReturnValue: SyncStatusContract;
            beforeEach(async () => {
              spyTransaction.mockClear();
              spyGet.mockClear();
              // call target
              actualReturnValue = await getDbRecordSyncStatusContract(
                dbEventLogs,
                targetContract.name,
              );
            });
            test("should start transaction", () => {
              expect(spyTransaction).toHaveBeenCalledOnce();
              expect(spyTransaction).toBeCalledWith(
                "r",
                tableNameSyncStatus,
                expect.anything(),
              );
            });
            test("should call with contract name", () => {
              expect(spyGet).toHaveBeenCalledOnce();
              expect(spyGet).toBeCalledWith(targetContract.name);
            });
            test("should return expected value", () => {
              expect(actualReturnValue).toEqual(
                syncStatusForSpecificContract(targetContract),
              );
            });
          });
        }
      }
    }
  }
});
describe("getDbRecordsSyncStatusContractByKeyValue", async () => {
  for (const targetChain of TARGET_CHAINS) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
        const spyTransaction: MockInstance = vi.spyOn(
          dbEventLogs,
          "transaction",
        );
        const spyToArray: MockInstance = vi.spyOn(
          dbEventLogs.table(tableNameSyncStatus),
          "toArray",
        );
        // extract contracts that emit eventLogs
        // extract contracts that emit eventLogs
        const eventEmittingContracts: Contract[] = extractEventContracts(
          targetVersion.contracts,
        );

        for (const targetContract of eventEmittingContracts) {
          const targetSyncStatusContract: SyncStatusContract =
            syncStatusForSpecificContract(targetContract);

          for (const key of Object.keys(targetSyncStatusContract)) {
            const keyOfSyncStatusContract: keyof SyncStatusContract =
              key as keyof SyncStatusContract;
            describe(`chainName:${targetChain.name}, projectName:${targetProject.name}, versionName:${targetVersion.name}, contractName:${targetContract.name}, key:${keyOfSyncStatusContract}, value:${targetSyncStatusContract[keyOfSyncStatusContract]}`, async () => {
              let actualReturnValue: SyncStatusContract[];
              beforeEach(async () => {
                spyTransaction.mockClear();
                spyToArray.mockClear();
                // call target
                actualReturnValue =
                  await getDbRecordsSyncStatusContractByKeyValue(
                    dbEventLogs,
                    keyOfSyncStatusContract,
                    targetSyncStatusContract[keyOfSyncStatusContract],
                  );
              });

              test("should start transaction", () => {
                expect(spyTransaction).toHaveBeenCalledOnce();
                expect(spyTransaction).toBeCalledWith(
                  "r",
                  tableNameSyncStatus,
                  expect.anything(),
                );
              });
              test("should call ToArray", () => {
                expect(spyToArray).toHaveBeenCalledOnce();
              });
              test("should return expected value", () => {
                // The table holds the initial data of every contract that
                // emits eventLogs. Build the expected records from that data,
                // not from the table.
                const expectedReturnValue: SyncStatusContract[] =
                  eventEmittingContracts
                    .map(syncStatusForSpecificContract)
                    .filter((syncStatusContract: SyncStatusContract) =>
                      isDeepStrictEqual(
                        syncStatusContract[keyOfSyncStatusContract],
                        targetSyncStatusContract[keyOfSyncStatusContract],
                      ),
                    );
                expect(actualReturnValue).toHaveLength(
                  expectedReturnValue.length,
                );
                expect(actualReturnValue).toEqual(
                  expect.arrayContaining(expectedReturnValue),
                );
              });
            });
          }
        }
      }
    }
  }
});
describe("getDbItemSyncStatus", async () => {
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
          const targetSyncStatusContract: SyncStatusContract =
            syncStatusForSpecificContract(targetContract);

          for (const key of Object.keys(targetSyncStatusContract)) {
            const keyOfSyncStatusContract: keyof SyncStatusContract =
              key as keyof SyncStatusContract;
            describe(`chainName:${targetChain.name}, projectName:${targetProject.name}, versionName:${targetVersion.name}, contractName:${targetContract.name}, key:${keyOfSyncStatusContract}, value:${targetSyncStatusContract[keyOfSyncStatusContract]}`, async () => {
              test("should return expected value", async () => {
                // call target
                const actualReturnValue = await getDbItemSyncStatus(
                  dbEventLogs,
                  targetContract.name,
                  keyOfSyncStatusContract,
                );

                const expectedReturnValue =
                  syncStatusForSpecificContract(targetContract)[
                    keyOfSyncStatusContract
                  ];

                expect(actualReturnValue).toEqual(expectedReturnValue);
              });
            });
          }
        }
      }
    }
  }
});

const syncStatusForSpecificContract = (
  targetContract: Contract,
): SyncStatusContract => {
  return {
    name: targetContract.name,
    isSyncTarget: true,
    isSyncing: false,
    isAbort: false,
    fetchedBlockNumber: targetContract.creation.blockNumber,
    creationBlockNumber: targetContract.creation.blockNumber,
    numOfSyncTargetContract: 1,
    syncStateText: "-",
    subSyncStatuses: null,
    events: Object.assign(
      {},
      ...targetContract.events.names.map((eventName) => {
        return { [eventName]: { recordCount: 0 } };
      }),
    ),
  };
};
