import "fake-indexeddb/auto";
import { DbEventLogs } from "./dbEventLogs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
  afterAll,
} from "vitest";
import type {
  ContractIdentifier,
  ConvertedEventLog,
  GroupedEventLogs,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { DB_TABLE_NAMES } from "./constants";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import {
  addEventLogs_updateFetchedBlockNumber,
  getEventLogTableRecordCount,
  getEventLogTableRecords,
} from "./dbEventLogsDataHandlersEventLog";
import * as UtilDb from "#utils/utilsDb.js";
import * as TargetModule from "./dbEventLogsDataHandlersEventLog";
import * as DataHandlerSyncStatusGetters from "./dbEventLogsDataHandlersSyncStatusGetters";
import * as GetUpdateTargetEventLogTables from "./dbEventLogsGetUpdateTargetEventLogTables";
import type { Contract } from "#constants/chains/types.js";
import Dexie from "dexie";
import { extractEventContracts } from "#utils/utilsEthers.js";

describe("addEventLogs_updateFetchedBlockNumber", () => {
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
          const toBlockNumber: number = targetContract.creation.blockNumber + 1;
          let spyGetUpdateTargetEventLogTables: MockInstance;
          let spyGetDbItemSyncStatus: MockInstance;
          let spyGetEventLogTableName: MockInstance;
          let spyUpdateState: MockInstance;

          afterAll(async () => {
            await Dexie.delete(dbEventLogs.name);
          });

          describe(`chainName:${targetChain.name}, projectName:${targetProject.name}, versionName:${targetVersion.name}, contractName:${targetContract.name}`, () => {
            // set spy
            beforeEach(() => {
              // set spy
              spyGetUpdateTargetEventLogTables = vi.spyOn(
                GetUpdateTargetEventLogTables,
                "getUpdateTargetEventLogTables",
              );
              // stub the sync status table so that each test starts from 0
              spyGetDbItemSyncStatus = vi
                .spyOn(DataHandlerSyncStatusGetters, "getDbItemSyncStatus")
                .mockImplementation(async () => {
                  return Object.fromEntries(
                    targetContract.events.names.map((eventName) => [
                      eventName,
                      { recordCount: 0 },
                    ]),
                  );
                });
              spyGetEventLogTableName = vi.spyOn(
                UtilDb,
                "getEventLogTableName",
              );
              spyUpdateState = vi.spyOn(storeSyncStatus, "updateState");
            });
            // resotre
            afterEach(() => {
              if (spyGetDbItemSyncStatus) {
                spyGetDbItemSyncStatus.mockRestore();
              }
              if (spyGetUpdateTargetEventLogTables) {
                spyGetUpdateTargetEventLogTables.mockRestore();
              }
              if (spyGetEventLogTableName) {
                spyGetEventLogTableName.mockRestore();
              }
              if (spyUpdateState) {
                spyUpdateState.mockRestore();
              }
            });
            test(`when "groupedEventlogs" is empty, only "fetchedBlockNumber" should be updated `, async () => {
              // make "groupedEventlogs" empty
              const groupedEventLogs: GroupedEventLogs = {};
              // call target
              await addEventLogs_updateFetchedBlockNumber(
                dbEventLogs,
                targetContract,
                groupedEventLogs,
                toBlockNumber,
              );
              // check the functions IS called
              expect(spyGetUpdateTargetEventLogTables).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                groupedEventLogs,
              );
              // // check the functions are NOT called
              expect(spyGetDbItemSyncStatus).not.toBeCalled();
              expect(spyGetEventLogTableName).not.toBeCalled();
              // check the DB and the store are updated once, after the commit
              expect(
                await getDbRecordSyncStatus(dbEventLogs, targetContract),
              ).toMatchObject({ fetchedBlockNumber: toBlockNumber });
              expect(spyUpdateState).toBeCalledTimes(1);
              expect(spyUpdateState).toBeCalledWith(
                { ...versionIdentifier, contractName: targetContract.name },
                { fetchedBlockNumber: toBlockNumber },
              );
            });
            test(`when "groupedEventlogs" is NOT empty, "fetchedBlockNumber" should are updated `, async () => {
              // make "groupedEventlogs"
              const groupedEventLogs: GroupedEventLogs = {};
              for (const targetEventName of targetContract.events.names) {
                groupedEventLogs[targetEventName] = [
                  { ...dummyConvertedEventLog1 },
                ];
              }

              const tableNames: string[] = targetContract.events.names.map(
                (eventName) =>
                  UtilDb.getEventLogTableName(targetContract.name, eventName),
              );
              const countsBefore: number[] = await Promise.all(
                tableNames.map((tableName) =>
                  dbEventLogs.table(tableName).count(),
                ),
              );

              // call target
              await addEventLogs_updateFetchedBlockNumber(
                dbEventLogs,
                targetContract,
                groupedEventLogs,
                toBlockNumber,
              );
              // check each table got one log
              const countsAfter: number[] = await Promise.all(
                tableNames.map((tableName) =>
                  dbEventLogs.table(tableName).count(),
                ),
              );
              expect(countsAfter).toEqual(
                countsBefore.map((count) => count + 1),
              );
              // check the functions ARE called
              expect(spyGetUpdateTargetEventLogTables).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                groupedEventLogs,
              );
              expect(spyGetDbItemSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "events",
              );
              for (const eventName of targetContract.events.names) {
                expect(spyGetEventLogTableName).toBeCalledWith(
                  targetContract.name,
                  eventName,
                );
              }
              // recordCount of each event should be increased by one
              const expectedSyncStatusContract: Partial<SyncStatusContract> = {
                fetchedBlockNumber: toBlockNumber,
                events: Object.fromEntries(
                  targetContract.events.names.map((eventName) => [
                    eventName,
                    { recordCount: 1 },
                  ]),
                ),
              };
              // check the DB and the store are updated once, after the commit
              expect(
                await getDbRecordSyncStatus(dbEventLogs, targetContract),
              ).toMatchObject(expectedSyncStatusContract);
              expect(spyUpdateState).toBeCalledTimes(1);
              expect(spyUpdateState).toBeCalledWith(
                { ...versionIdentifier, contractName: targetContract.name },
                expectedSyncStatusContract,
              );
            });
          });
        }
      }
    }
  }
});

describe("addEventLogs_updateFetchedBlockNumber when the transaction fails", () => {
  for (const targetChain of TARGET_CHAINS) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);

        afterAll(async () => {
          await Dexie.delete(dbEventLogs.name);
        });

        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
          test(`should not update the DB nor the store: ${Object.values(versionIdentifier).join("/")}/${targetContract.name}`, async () => {
            const contractIdentifier: ContractIdentifier = {
              ...versionIdentifier,
              contractName: targetContract.name,
            };
            const groupedEventLogs: GroupedEventLogs = {};
            for (const eventName of targetContract.events.names) {
              groupedEventLogs[eventName] = [{ ...dummyConvertedEventLog1 }];
            }
            const recordBefore: SyncStatusContract =
              await getDbRecordSyncStatus(dbEventLogs, targetContract);
            const storeBefore: SyncStatusContract = structuredClone(
              getStoreSyncStatusContract(contractIdentifier),
            );

            // fail the outer transaction after all the writes in it,
            // as when the commit fails
            const originalTransaction = dbEventLogs.transaction.bind(
              dbEventLogs,
            ) as (
              mode: "rw",
              tableNames: string[],
              scope: () => Promise<void>,
            ) => Promise<void>;
            const spyTransaction = vi
              .spyOn(dbEventLogs, "transaction")
              .mockImplementationOnce(((
                mode: "rw",
                tableNames: string[],
                scope: () => Promise<void>,
              ) =>
                originalTransaction(mode, tableNames, async () => {
                  await scope();
                  throw new Error("Commit failed.");
                })) as never);

            // call target
            await expect(
              addEventLogs_updateFetchedBlockNumber(
                dbEventLogs,
                targetContract,
                groupedEventLogs,
                targetContract.creation.blockNumber + 1,
              ),
            ).rejects.toThrow("Commit failed.");

            // the DB is rolled back, and the store should stay the same
            expect(
              await getDbRecordSyncStatus(dbEventLogs, targetContract),
            ).toEqual(recordBefore);
            expect(getStoreSyncStatusContract(contractIdentifier)).toEqual(
              storeBefore,
            );
            spyTransaction.mockRestore();
          });
        }
      }
    }
  }
});
async function getDbRecordSyncStatus(
  dbEventLogs: DbEventLogs,
  targetContract: Contract,
): Promise<SyncStatusContract> {
  return await dbEventLogs
    .table(DB_TABLE_NAMES.EventLog.syncStatus)
    .get(targetContract.name);
}
function getStoreSyncStatusContract(
  contractIdentifier: ContractIdentifier,
): SyncStatusContract {
  return get(storeSyncStatus)[contractIdentifier.chainName].subSyncStatuses[
    contractIdentifier.projectName
  ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses[
    contractIdentifier.contractName
  ]!;
}

describe("getEventLogTableRecordCount", () => {
  test("should return num of table record", async () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };
          const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
          for (const targetContract of targetVersion.contracts) {
            for (const targetEventName of targetContract.events.names) {
              const tableName: string = UtilDb.getEventLogTableName(
                targetContract.name,
                targetEventName,
              );
              // set spy
              const spyTableCount = vi.spyOn(
                dbEventLogs.table(tableName),
                "count",
              );
              // call target
              const result: number = await getEventLogTableRecordCount(
                dbEventLogs,
                tableName,
              );
              // check
              expect(spyTableCount).toBeCalled();
              expect(result).toBe(0);
              // restore
              spyTableCount.mockRestore();
            }
          }
        }
      }
    }
  });
});
const dummyConvertedEventLog1: ConvertedEventLog = {
  args: [],
  blockNumber: 1,
  jsDate: new Date(10),
  logIndex: 100,
  removed: true,
  transactionHash: "0xTransactionHash1",
  transactionIndex: 10000,
};
const dummyConvertedEventLog2: ConvertedEventLog = {
  args: [],
  blockNumber: 2,
  jsDate: new Date(20),
  logIndex: 200,
  removed: true,
  transactionHash: "0xTransactionHash2",
  transactionIndex: 20000,
};
const returnValueOfTableToArray: ConvertedEventLog[] = [
  { ...dummyConvertedEventLog1 },
  dummyConvertedEventLog2,
];
describe("getEventLogTableRecords", () => {
  test(`should call "sortEventLogs" with the 2nd arg "asc" when sortModifier is "asc".`, async () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };
          const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
          for (const targetContract of targetVersion.contracts) {
            for (const targetEventName of targetContract.events.names) {
              const tableName: string = UtilDb.getEventLogTableName(
                targetContract.name,
                targetEventName,
              );

              // A new array in an unsorted order for each call, because
              // "sortEventLogs" sorts the array in place.
              const tableRecords: ConvertedEventLog[] = [
                dummyConvertedEventLog2,
                { ...dummyConvertedEventLog1 },
              ];
              const expectedResult: ConvertedEventLog[] = [
                { ...dummyConvertedEventLog1 },
                dummyConvertedEventLog2,
              ];

              // set spy
              const spyTableToArray = vi
                .spyOn(dbEventLogs.table(tableName), "toArray")
                .mockResolvedValue(tableRecords);
              const spySortEventLogs = vi.spyOn(TargetModule, "sortEventLogs");

              // call target
              const result: ConvertedEventLog[] = await getEventLogTableRecords(
                dbEventLogs,
                tableName,
                "asc",
              );
              // check
              expect(spyTableToArray).toBeCalled();
              expect(spySortEventLogs).toBeCalledWith(tableRecords, "asc");
              expect(result).toEqual(expectedResult);
              // restore
              spySortEventLogs.mockRestore();
              spyTableToArray.mockRestore();
            }
          }
        }
      }
    }
  });
  test(`should call "sortEventLogs" with the 2nd arg "desc" when sortModifier is "desc".`, async () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };
          const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
          for (const targetContract of targetVersion.contracts) {
            for (const targetEventName of targetContract.events.names) {
              const tableName: string = UtilDb.getEventLogTableName(
                targetContract.name,
                targetEventName,
              );

              // A new array in an unsorted order for each call, because
              // "sortEventLogs" sorts the array in place.
              const tableRecords: ConvertedEventLog[] = [
                { ...dummyConvertedEventLog1 },
                dummyConvertedEventLog2,
              ];
              const expectedResult: ConvertedEventLog[] = [
                dummyConvertedEventLog2,
                { ...dummyConvertedEventLog1 },
              ];

              // set spy
              const spyTableToArray = vi
                .spyOn(dbEventLogs.table(tableName), "toArray")
                .mockResolvedValue(tableRecords);
              const spySortEventLogs = vi.spyOn(TargetModule, "sortEventLogs");

              // call target
              const result: ConvertedEventLog[] = await getEventLogTableRecords(
                dbEventLogs,
                tableName,
                "desc",
              );
              // check
              expect(spyTableToArray).toBeCalled();
              expect(spySortEventLogs).toBeCalledWith(tableRecords, "desc");
              expect(result).toEqual(expectedResult);
              // restore
              spySortEventLogs.mockRestore();
              spyTableToArray.mockRestore();
            }
          }
        }
      }
    }
  });
  test(`should NOT call "sortEventLogs" when sortModifier is "undefined".`, async () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };
          const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
          for (const targetContract of targetVersion.contracts) {
            for (const targetEventName of targetContract.events.names) {
              const tableName: string = UtilDb.getEventLogTableName(
                targetContract.name,
                targetEventName,
              );

              // set spy
              const spyTableToArray = vi
                .spyOn(dbEventLogs.table(tableName), "toArray")
                .mockResolvedValue(returnValueOfTableToArray);
              const spySortEventLogs = vi.spyOn(TargetModule, "sortEventLogs");

              // call target
              const result: ConvertedEventLog[] = await getEventLogTableRecords(
                dbEventLogs,
                tableName,
                undefined,
              );
              // check
              expect(spyTableToArray).toBeCalled();
              expect(spySortEventLogs).not.toBeCalled();
              expect(result).toEqual(returnValueOfTableToArray);
              // restore
              spySortEventLogs.mockRestore();
              spyTableToArray.mockRestore();
            }
          }
        }
      }
    }
  });
});
describe("sortEventLogs", () => {
  let logs: ConvertedEventLog[];

  beforeEach(() => {
    logs = [
      {
        args: [],
        blockNumber: 2,
        jsDate: new Date(),
        logIndex: 1,
        removed: false,
        transactionHash: "0xhash1",
        transactionIndex: 1,
      },
      {
        args: [],
        blockNumber: 2,
        jsDate: new Date(),
        logIndex: 2,
        removed: false,
        transactionHash: "0xhash2",
        transactionIndex: 2,
      },
      {
        args: [],
        blockNumber: 1,
        jsDate: new Date(),
        logIndex: 1,
        removed: false,
        transactionHash: "0xhash3",
        transactionIndex: 3,
      },
    ];
  });

  test("should sort logs in ascending order by blockNumber", () => {
    const sortedLogs = TargetModule.sortEventLogs(logs, "asc");
    expect(sortedLogs[0].blockNumber).toBe(1);
    expect(sortedLogs[1].blockNumber).toBe(2);
    expect(sortedLogs[2].blockNumber).toBe(2);
  });

  test("should sort logs in ascending order by logIndex when blockNumber is the same", () => {
    const sortedLogs = TargetModule.sortEventLogs(logs, "asc");
    expect(sortedLogs[1].logIndex).toBe(1);
    expect(sortedLogs[2].logIndex).toBe(2);
  });

  test("should sort logs in descending order by blockNumber", () => {
    const sortedLogs = TargetModule.sortEventLogs(logs, "desc");
    expect(sortedLogs[0].blockNumber).toBe(2);
    expect(sortedLogs[1].blockNumber).toBe(2);
    expect(sortedLogs[2].blockNumber).toBe(1);
  });

  test("should sort logs in descending order by logIndex when blockNumber is the same", () => {
    const sortedLogs = TargetModule.sortEventLogs(logs, "desc");
    expect(sortedLogs[0].logIndex).toBe(2);
    expect(sortedLogs[1].logIndex).toBe(1);
  });

  test("should return the same array when input is empty", () => {
    const sortedLogs = TargetModule.sortEventLogs([], "asc");
    expect(sortedLogs).toEqual([]);
  });
});
