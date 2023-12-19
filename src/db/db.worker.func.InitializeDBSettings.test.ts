import { describe, expect, test, vi } from "vitest";
import { dbWorkerFuncInitializeDBSettings } from "./db.worker.func.InitializeDBSettings";
import { addInitialDataOfDbSettings } from "./dbSettings";
import * as DBS from "./dbSettings";

describe("dbWorkerFuncInitializeDBSettings", () => {
  test("should call addInitialData", async () => {
    vi.spyOn(DBS, "addInitialDataOfDbSettings").mockImplementation(
      (): Promise<void> => {
        return Promise.resolve();
      },
    );
    await dbWorkerFuncInitializeDBSettings();
    expect(addInitialDataOfDbSettings).toBeCalled();
  });
});
