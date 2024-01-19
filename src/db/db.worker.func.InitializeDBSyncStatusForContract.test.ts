import { describe, expect, test, vi } from "vitest";
import * as InitializeDBSyncStatusForContract from "./db.worker.func.InitializeDBSyncStatusForContract";
import { DbEventLogs } from "./dbEventLogs";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { VersionIdentifier } from "./dbTypes";
import * as DbEventLogsDataHandlersSyncStatusUpdaters from "./dbEventLogsDataHandlersSyncStatusUpdaters";
import * as DbEventLogsDataHandlersEventLog from "./dbEventLogsDataHandlersEventLog";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";

import * as UtlisDb from "@utils/utlisDb";

vi.mock("./dbEventLogs");
vi.mock("./dbEventLogsDataHandlersEventLog");

const spyUpdateDbRecordSyncStatus = vi
  .spyOn(DbEventLogsDataHandlersSyncStatusUpdaters, "updateDbRecordSyncStatus")
  .mockImplementation((): Promise<void> => {
    return Promise.resolve();
  });
const spyGetEventLogTableName = vi.spyOn(UtlisDb, "getEventLogTableName");
const spyGetEventLogTableRecordCount = vi.spyOn(
  DbEventLogsDataHandlersEventLog,
  "getEventLogTableRecordCount",
);

describe("initializeDBSyncStatusForContract", () => {
  test("should initialize DB sync status for contract", async () => {
    const targetChain: Chain = TARGET_CHAINS[0];
    const targetProject: Project = targetChain.projects[0];
    const targetVersion: Version = targetProject.versions[0];
    const targetContract: Contract = targetVersion.contracts[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
    };
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
    expect(spyUpdateDbRecordSyncStatus).toBeCalled();
  });
});
