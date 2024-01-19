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
  ConvertedEventLog,
  GroupedEventLogs,
  VersionIdentifier,
} from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import {
  addEventLogs_updateFetchedBlockNumber,
  getEventLogTableRecordCount,
  getEventLogTableRecords,
} from "./dbEventLogsDataHandlersEventLog";
import * as UtilDb from "@utils/utlisDb";
import * as TargetModule from "./dbEventLogsDataHandlersEventLog";
import * as DataHandlerSyncStatusGetters from "./dbEventLogsDataHandlersSyncStatusGetters";
import * as DataHandlerSyncStatusUpdaters from "./dbEventLogsDataHandlersSyncStatusUpdaters";
import * as GetUpdateTargetEventLogTables from "./dbEventLogsGetUpdateTargetEventLogTables";
import type { Contract } from "@constants/chains/types";
import Dexie from "dexie";

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
        const eventEmittingContracts: Contract[] =
          targetVersion.contracts.filter((contract) => {
            return contract.events.abiFragments.length > 0;
          });

        for (const targetContract of eventEmittingContracts) {
          const toBlockNumber: number = targetContract.creation.blockNumber + 1;
          let spyGetUpdateTargetEventLogTables: MockInstance;
          let spyGetDbItemSyncStatus: MockInstance;
          let spyGetEventLogTableName: MockInstance;
          let spyUpdateDbItemSyncStatus: MockInstance;

          // set spy
          beforeEach(() => {
            // set spy
            spyGetUpdateTargetEventLogTables = vi.spyOn(
              GetUpdateTargetEventLogTables,
              "getUpdateTargetEventLogTables",
            );
            spyGetDbItemSyncStatus = vi.spyOn(
              DataHandlerSyncStatusGetters,
              "getDbItemSyncStatus",
            );
            spyGetEventLogTableName = vi.spyOn(UtilDb, "getEventLogTableName");
            spyUpdateDbItemSyncStatus = vi.spyOn(
              DataHandlerSyncStatusUpdaters,
              "updateDbItemSyncStatus",
            );
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
            if (spyUpdateDbItemSyncStatus) {
              spyUpdateDbItemSyncStatus.mockRestore();
            }
          });
          afterAll(async () => {
            await Dexie.delete(dbEventLogs.name);
          });

          describe(`chainName:${targetChain.name}, projectName:${targetProject.name}, versionName:${targetVersion.name}, contractName:${targetContract.name}`, () => {
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
              expect(spyUpdateDbItemSyncStatus).not.toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "events",
                expect.anything(),
              );
              // check the function IS called
              expect(spyUpdateDbItemSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "fetchedBlockNumber",
                toBlockNumber,
              );
            });
            test(`when "groupedEventlogs" is NOT empty, "fetchedBlockNumber" should are updated `, async () => {
              // make "groupedEventlogs"
              let groupedEventLogs: GroupedEventLogs = {};
              for (const targetEventName of targetContract.events.names) {
                groupedEventLogs[targetEventName] = [
                  { ...dummyConvertedEventLog1, eventName: targetEventName },
                ];
              }

              // call target
              await addEventLogs_updateFetchedBlockNumber(
                dbEventLogs,
                targetContract,
                groupedEventLogs,
                toBlockNumber,
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
              expect(spyGetEventLogTableName).toBeCalledWith(
                targetContract.name,
                expect.anything(),
              );
              expect(spyUpdateDbItemSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "events",
                expect.anything(),
              );
              expect(spyUpdateDbItemSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "fetchedBlockNumber",
                toBlockNumber,
              );
            });
          });
        }
      }
    }
  }
});

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
  eventName: "eventName1",
  eventSignature: "eventSignature1",
  args: [],
  blockNumber: 1,
  jsDate: new Date(10),
  blockHash: "0xBlockHash1",
  data: "0xData1",
  logIndex: 100,
  removed: true,
  topics: ["0xTopic1000"],
  address: "0xAddress1",
  transactionHash: "0xTransactionHash1",
  transactionIndex: 10000,
};
const dummyConvertedEventLog2: ConvertedEventLog = {
  eventName: "eventName2",
  eventSignature: "eventSignature2",
  args: [],
  blockNumber: 2,
  jsDate: new Date(20),
  blockHash: "0xBlockHash2",
  data: "0xData2",
  logIndex: 200,
  removed: true,
  topics: ["0xTopic2000"],
  address: "0xAddress2",
  transactionHash: "0xTransactionHash2",
  transactionIndex: 20000,
};
const returnValueOfTableToArray: ConvertedEventLog[] = [
  dummyConvertedEventLog1,
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

              // set spy
              const spyTableToArray = vi
                .spyOn(dbEventLogs.table(tableName), "toArray")
                .mockResolvedValue(returnValueOfTableToArray);
              const spySortEventLogs = vi.spyOn(TargetModule, "sortEventLogs");

              // call target
              const result: ConvertedEventLog[] = await getEventLogTableRecords(
                dbEventLogs,
                tableName,
                "asc",
              );
              // check
              expect(spyTableToArray).toBeCalled();
              expect(spySortEventLogs).toBeCalledWith(
                returnValueOfTableToArray,
                "asc",
              );
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

              // set spy
              const spyTableToArray = vi
                .spyOn(dbEventLogs.table(tableName), "toArray")
                .mockResolvedValue(returnValueOfTableToArray);
              const spySortEventLogs = vi.spyOn(TargetModule, "sortEventLogs");

              // call target
              const result: ConvertedEventLog[] = await getEventLogTableRecords(
                dbEventLogs,
                tableName,
                "desc",
              );
              // check
              expect(spyTableToArray).toBeCalled();
              expect(spySortEventLogs).toBeCalledWith(
                returnValueOfTableToArray,
                "desc",
              );
              expect(result).toEqual(returnValueOfTableToArray.reverse());
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
        eventName: "event1",
        eventSignature: "sig1",
        args: [],
        blockNumber: 2,
        jsDate: new Date(),
        blockHash: "0xhash1",
        data: "0xdata1",
        logIndex: 1,
        removed: false,
        topics: ["0xtopic1"],
        address: "0xaddress1",
        transactionHash: "0xhash1",
        transactionIndex: 1,
      },
      {
        eventName: "event2",
        eventSignature: "sig2",
        args: [],
        blockNumber: 2,
        jsDate: new Date(),
        blockHash: "0xhash2",
        data: "0xdata2",
        logIndex: 2,
        removed: false,
        topics: ["0xtopic2"],
        address: "0xaddress2",
        transactionHash: "0xhash2",
        transactionIndex: 2,
      },
      {
        eventName: "event3",
        eventSignature: "sig3",
        args: [],
        blockNumber: 1,
        jsDate: new Date(),
        blockHash: "0xhash3",
        data: "0xdata3",
        logIndex: 1,
        removed: false,
        topics: ["0xtopic3"],
        address: "0xaddress3",
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
