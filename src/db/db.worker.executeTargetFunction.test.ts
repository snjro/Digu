import { executeTargetFunction } from "./db.worker.executeTargetFunction";
import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { dbWorkerFuncInitializeDBSyncStatus } from "./db.worker.func.InitializeDBSyncStatus";
import { beforeEach, describe, expect, test, vi } from "vitest";
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
    expect(result).toBeUndefined();
  });

  test("should call the correct function for initializeDbSettings", async () => {
    const result = await executeTargetFunction(
      "initializeDbSettings",
      undefined,
    );
    expect(dbWorkerFuncInitializeDBSettings).toHaveBeenCalledTimes(1);
    expect(dbWorkerFuncInitializeDBSyncStatus).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
