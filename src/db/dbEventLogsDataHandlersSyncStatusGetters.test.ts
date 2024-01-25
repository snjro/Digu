import { TARGET_CHAINS } from "@constants/chains/_index";
import "fake-indexeddb/auto";
import { describe, vi, type MockInstance, test, expect } from "vitest";
import type { SyncStatusContract, VersionIdentifier } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import {
  getDbRecordSyncStatusContract,
  getDbRecordsSyncStatusContractByKeyValue,
  getDbItemSyncStatus,
} from "./dbEventLogsDataHandlersSyncStatusGetters";

import { DB_TABLE_NAMES } from "./constants";
import type { Contract } from "@constants/chains/types";
import { areValuesEqual } from "@utils/utilsCommon";
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
          // call target
          const actualReturnValue: SyncStatusContract =
            await getDbRecordSyncStatusContract(
              dbEventLogs,
              targetContract.name,
            );
          describe(`chainName:${targetChain.name}, projectName:${targetProject.name}, versionName:${targetVersion.name}, contractName:${targetContract.name}`, async () => {
            test("should start transaction", () => {
              expect(spyTransaction).toBeCalledWith(
                "r",
                tableNameSyncStatus,
                expect.anything(),
              );
            });
            test("should call with contract name", () => {
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
              // call target
              const actualReturnValue: SyncStatusContract[] =
                await getDbRecordsSyncStatusContractByKeyValue(
                  dbEventLogs,
                  keyOfSyncStatusContract,
                  targetSyncStatusContract[keyOfSyncStatusContract],
                );

              test("should start transaction", () => {
                expect(spyTransaction).toBeCalledWith(
                  "r",
                  tableNameSyncStatus,
                  expect.anything(),
                );
              });
              test("should call ToArray", () => {
                expect(spyToArray).toBeCalled();
              });
              test("should return expected value", async () => {
                const expectedReturnValue = async (): Promise<
                  SyncStatusContract[]
                > => {
                  switch (keyOfSyncStatusContract) {
                    case "isAbort":
                    case "isSyncTarget":
                    case "isSyncing":
                    case "numOfSyncTargetContract":
                    case "syncStateText":
                    case "subSyncStatuses":
                      return await dbEventLogs
                        .table(tableNameSyncStatus)
                        .toArray();

                    default:
                      return (
                        await dbEventLogs.table(tableNameSyncStatus).toArray()
                      ).filter((syncStatusContract: SyncStatusContract) => {
                        return areValuesEqual(
                          syncStatusContract[keyOfSyncStatusContract],
                          targetSyncStatusContract[keyOfSyncStatusContract],
                        );
                      });
                  }
                };
                expect(actualReturnValue).toEqual(await expectedReturnValue());
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
              // call target
              const actualReturnValue = await getDbItemSyncStatus(
                dbEventLogs,
                targetContract.name,
                keyOfSyncStatusContract,
              );

              test("should return expected value", async () => {
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
