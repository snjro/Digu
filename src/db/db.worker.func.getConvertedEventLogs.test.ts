import { dbWorkerFuncGetConvertedEventLogs } from "./db.worker.func.getConvertedEventLogs"; // ファイル名を適切なものに変更してください
import { getEventLogTableName } from "@utils/utlisDb";
import { DbEventLogs } from "./dbEventLogs";
import { getEventLogTableRecords } from "./dbEventLogsDataHandlersEventLog";
import { describe, expect, test, vi } from "vitest";

vi.mock("@utils/utlisDb");
vi.mock("./dbEventLogs");
vi.mock("./dbEventLogsDataHandlersEventLog");

describe("dbWorkerFuncGetConvertedEventLogs", () => {
  test("should call the correct functions and return the expected result", async () => {
    const mockEventIdentifier = {
      chainName: "testChain",
      projectName: "testProject",
      versionName: "testVersion",
      contractName: "testContract",
      abiFragmentName: "testAbiFragment",
    };

    await dbWorkerFuncGetConvertedEventLogs(mockEventIdentifier);

    expect(getEventLogTableName).toHaveBeenCalledWith(
      mockEventIdentifier.contractName,
      mockEventIdentifier.abiFragmentName,
    );
    expect(DbEventLogs).toHaveBeenCalledWith({
      chainName: mockEventIdentifier.chainName,
      projectName: mockEventIdentifier.projectName,
      versionName: mockEventIdentifier.versionName,
    });
    expect(getEventLogTableRecords).toHaveBeenCalledWith(
      expect.any(DbEventLogs),
      getEventLogTableName(
        mockEventIdentifier.contractName,
        mockEventIdentifier.abiFragmentName,
      ),
      "asc",
    );
  });
});
