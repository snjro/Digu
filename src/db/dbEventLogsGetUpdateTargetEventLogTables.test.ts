import "fake-indexeddb/auto";
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";
import * as UtilsDb from "@utils/utlisDb";
import { DbEventLogs } from "./dbEventLogs";
import type { GroupedEventLogs, VersionIdentifier } from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { getUpdateTargetEventLogTables } from "./dbEventLogsGetUpdateTargetEventLogTables";
import type { EventAbiFragment } from "@constants/chains/types";
import type { Table } from "dexie";
import { DB_TABLE_NAMES } from "./constants";

describe("getUpdateTargetEventLogTables", () => {
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
          // set spy
          let spyGetEventLogTableName: MockInstance;
          // restore
          afterEach(() => {
            if (spyGetEventLogTableName) {
              spyGetEventLogTableName.mockRestore();
            }
          });
          test("should return eventLog tables and syncStatus table when groupedEventLogs is NOT empty", () => {
            const groupedEventLogs: GroupedEventLogs = getDummyGroupedEventLogs(
              targetContract.events.names,
            );
            spyGetEventLogTableName = vi.spyOn(UtilsDb, "getEventLogTableName");
            // call target
            const actualReturnedTables: Table[] = getUpdateTargetEventLogTables(
              dbEventLogs,
              targetContract.name,
              groupedEventLogs,
            );
            // expected return
            const expectedReturnTables: Table[] =
              targetContract.events.names.map((eventName) => {
                return dbEventLogs.table(`${targetContract.name}_${eventName}`);
              });
            expectedReturnTables.push(
              dbEventLogs.table(DB_TABLE_NAMES.EventLog.syncStatus),
            );
            // check
            for (const targetEventName of targetContract.events.names) {
              expect(spyGetEventLogTableName).toBeCalled();
              expect(spyGetEventLogTableName).toBeCalledWith(
                targetContract.name,
                targetEventName,
              );
            }
            expect(actualReturnedTables.length).toEqual(
              expectedReturnTables.length,
            );
            for (let i = 0; i < actualReturnedTables.length; i++) {
              expect(actualReturnedTables[i]).toEqual(expectedReturnTables[i]);
            }
          });
        }
      }
    }
  }
});
function getDummyGroupedEventLogs(
  eventNames: EventAbiFragment["name"][],
): GroupedEventLogs {
  let dummyGroupedEventLogs: GroupedEventLogs = {};
  for (let i = 0; i < eventNames.length; i++) {
    const eventName: string = eventNames[i];
    dummyGroupedEventLogs[eventName] = [
      {
        eventName: eventName,
        eventSignature: `eventSignature${i}`,
        args: [],
        blockNumber: i,
        jsDate: new Date(i * 1000), // convert milliSec to Sec
        blockHash: `0xBlockHash${i}`,
        data: `0xData${i}`,
        logIndex: 100,
        removed: true,
        topics: [`0xTopic${i}`],
        address: `0xAddress${i}`,
        transactionHash: `0xTransactionHash${i}`,
        transactionIndex: i,
      },
    ];
  }
  return dummyGroupedEventLogs;
}
