import { executeTargetFunction } from "./db.worker.executeTargetFunction";
import { dbWorkerFuncGetConvertedEventLogs } from "./db.worker.func.getConvertedEventLogs";
import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { dbWorkerFuncInitializeDBSyncStatus } from "./db.worker.func.InitializeDBSyncStatus";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { DbWorkerMessageParams } from "./db.worker.types";
import type { ConvertedEventLog } from "./dbTypes";

vi.mock("./db.worker.func.getConvertedEventLogs");
vi.mock("./db.worker.func.InitializeDBSettings");
vi.mock("./db.worker.func.InitializeDBSyncStatus");

describe("executeTargetFunction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("should call the correct function for initializeDBSyncStatus", async () => {
    const result = await executeTargetFunction(
      "initializeDBSyncStatus",
      undefined,
    );
    expect(dbWorkerFuncInitializeDBSyncStatus).toHaveBeenCalledTimes(1);
    expect(dbWorkerFuncInitializeDBSettings).not.toHaveBeenCalled();
    expect(dbWorkerFuncGetConvertedEventLogs).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  test("should call the correct function for initializeDbSettings", async () => {
    const result = await executeTargetFunction(
      "initializeDbSettings",
      undefined,
    );
    expect(dbWorkerFuncInitializeDBSettings).toHaveBeenCalledTimes(1);
    expect(dbWorkerFuncInitializeDBSyncStatus).not.toHaveBeenCalled();
    expect(dbWorkerFuncGetConvertedEventLogs).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  test("should call the correct function for getConvertedEventLogs", async () => {
    const params: DbWorkerMessageParams<"getConvertedEventLogs"> = {
      chainName: "",
      projectName: "",
      versionName: "",
      contractName: "",
      abiFragmentName: "",
    };
    const convertedEventLogs = [
      { eventName: "event1" },
    ] as unknown as ConvertedEventLog[];
    vi.mocked(dbWorkerFuncGetConvertedEventLogs).mockResolvedValueOnce(
      convertedEventLogs,
    );
    const result = await executeTargetFunction("getConvertedEventLogs", params);
    expect(dbWorkerFuncGetConvertedEventLogs).toHaveBeenCalledTimes(1);
    expect(dbWorkerFuncGetConvertedEventLogs).toHaveBeenCalledWith(params);
    expect(dbWorkerFuncInitializeDBSyncStatus).not.toHaveBeenCalled();
    expect(dbWorkerFuncInitializeDBSettings).not.toHaveBeenCalled();
    expect(result).toBe(convertedEventLogs);
  });
});
