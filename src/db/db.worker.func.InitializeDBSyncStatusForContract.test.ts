import { beforeEach, describe, expect, test, vi } from "vitest";
import * as InitializeDBSyncStatusForContract from "./db.worker.func.InitializeDBSyncStatusForContract";
import { DbEventLogs } from "./dbEventLogs";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { VersionIdentifier } from "./dbTypes";
import * as DbEventLogsDataHandlersSyncStatusUpdatersDbRecordSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import * as DbEventLogsDataHandlersEventLog from "./dbEventLogsDataHandlersEventLog";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "#constants/chains/types.js";

import * as UtlisDb from "#utils/utilsDb.js";

vi.mock("./dbEventLogs");
vi.mock("./dbEventLogsDataHandlersEventLog");

const spyUpdateDbRecordSyncStatus = vi
  .spyOn(
    DbEventLogsDataHandlersSyncStatusUpdatersDbRecordSyncStatus,
    "updateDbRecordSyncStatus",
  )
  .mockImplementation((): Promise<void> => {
    return Promise.resolve();
  });
const spyGetEventLogTableName = vi.spyOn(UtlisDb, "getEventLogTableName");
// A different count for each table: the length of its name.
const spyGetEventLogTableRecordCount = vi
  .spyOn(DbEventLogsDataHandlersEventLog, "getEventLogTableRecordCount")
  .mockImplementation(
    (_dbEventLogs, eventLogTableName: string): Promise<number> =>
      Promise.resolve(eventLogTableName.length),
  );

const targetChain: Chain = TARGET_CHAINS[0];
const targetProject: Project = targetChain.projects[0];
const targetVersion: Version = targetProject.versions[0];
const targetContract: Contract = targetVersion.contracts[0];
const versionIdentifier: VersionIdentifier = {
  chainName: targetChain.name,
  projectName: targetProject.name,
  versionName: targetVersion.name,
};

describe("initializeDBSyncStatusForContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should initialize DB sync status for contract", async () => {
    const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);

    await InitializeDBSyncStatusForContract.initializeDBSyncStatusForContract(
      dbEventLogs,
      targetContract,
    );
    for (const eventName of targetContract.events.names) {
      expect(spyGetEventLogTableName).toBeCalledWith(
        targetContract.name,
        eventName,
      );
      expect(spyGetEventLogTableRecordCount).toBeCalledWith(
        dbEventLogs,
        UtlisDb.getEventLogTableName(targetContract.name, eventName),
      );
    }
    expect(spyUpdateDbRecordSyncStatus).toBeCalledWith(
      dbEventLogs,
      targetContract.name,
      {
        isAbort: false,
        isSyncing: false,
        creationBlockNumber: targetContract.creation.blockNumber,
        events: Object.fromEntries(
          targetContract.events.names.map((eventName) => [
            eventName,
            {
              recordCount: UtlisDb.getEventLogTableName(
                targetContract.name,
                eventName,
              ).length,
            },
          ]),
        ),
      },
    );
  });
});
