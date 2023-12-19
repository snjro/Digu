import { executeTargetFunction } from "./db.worker.executeTargetFuction";
import { dbWorkerFuncGetConvertedEventLogs } from "./db.worker.func.getConvertedEventLogs";
import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { dbWorkerFuncInitializeDBSyncStatus } from "./db.worker.func.InitializeDBSyncStatus";
import { describe, expect, test, vi } from "vitest";
import type { DbWorkerMessageParams } from "./db.worker.types";

vi.mock("./db.worker.func.getConvertedEventLogs");
vi.mock("./db.worker.func.InitializeDBSettings");
vi.mock("./db.worker.func.InitializeDBSyncStatus");

describe("executeTargetFunction", () => {
  test("should call the correct function for initializeDBSyncStatus", async () => {
    await executeTargetFunction("initializeDBSyncStatus", undefined);
    expect(dbWorkerFuncInitializeDBSyncStatus).toHaveBeenCalled();
  });

  test("should call the correct function for initializeDbSettings", async () => {
    await executeTargetFunction("initializeDbSettings", undefined);
    expect(dbWorkerFuncInitializeDBSettings).toHaveBeenCalled();
  });

  test("should call the correct function for getConvertedEventLogs", async () => {
    const params: DbWorkerMessageParams<"getConvertedEventLogs"> = {
      chainName: "",
      projectName: "",
      versionName: "",
      contractName: "",
      abiFragmentName: "",
    };
    await executeTargetFunction("getConvertedEventLogs", params);
    expect(dbWorkerFuncGetConvertedEventLogs).toHaveBeenCalledWith(params);
  });
});
