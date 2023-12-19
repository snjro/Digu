import { startDbWorker } from "./db.worker.portal";
import { customLogger } from "@utils/logger";
import DbWorker from "@db/db.worker?worker";
import { describe, expect, test, vi } from "vitest";
import type { DbWorkerMessage, TargetFunctionName } from "./db.worker.types";

vi.mock("@utils/logger", () => ({
  customLogger: {
    finished: vi.fn(),
  },
}));

vi.mock("@db/db.worker?worker", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        addEventListener: vi.fn((event, callback) => {
          console.log(event);
          callback({ data: { value: "test value", log: "test log" } });
        }),
        postMessage: vi.fn(),
        terminate: vi.fn(),
      };
    }),
  };
});

describe("startDbWorker", () => {
  test("should start DB worker", async () => {
    const dbWorkerMessage: DbWorkerMessage<TargetFunctionName> = {
      targetFunctionName: "getConvertedEventLogs",
      params: undefined,
    };

    const result = await startDbWorker(dbWorkerMessage);

    expect(result).toBe("test value");
    expect(DbWorker).toHaveBeenCalledTimes(1);
    expect(customLogger.finished).toHaveBeenCalledWith("test log");
  });
});
