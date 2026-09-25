import { gridRows } from "./gridRows";
import { startDbWorker } from "@db/db.worker.portal";
import { customLogger } from "@utils/logger";
import type { AbiFragmentIdentifier } from "@db/dbTypes";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@db/db.worker.portal");
vi.mock("@utils/logger", () => ({
  customLogger: {
    error: vi.fn(),
  },
}));

const eventIdentifier: AbiFragmentIdentifier = {
  chainName: "ethereum",
  projectName: "",
  versionName: "",
  contractName: "",
  abiFragmentName: "",
} as AbiFragmentIdentifier;

describe("gridRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return the rows from the worker", async () => {
    vi.mocked(startDbWorker).mockResolvedValueOnce([]);

    await expect(gridRows(eventIdentifier)).resolves.toEqual([]);
    expect(customLogger.error).not.toHaveBeenCalled();
  });

  test("should log the error and return no rows when the worker fails", async () => {
    const error = new Error("test error");
    vi.mocked(startDbWorker).mockRejectedValueOnce(error);

    await expect(gridRows(eventIdentifier)).resolves.toEqual([]);
    expect(customLogger.error).toHaveBeenCalledWith("Get event logs.", {
      eventIdentifier: eventIdentifier,
      errorObject: error,
    });
  });
});
