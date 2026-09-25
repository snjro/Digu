import { startDbWorker } from "./db.worker.portal";
import { customLogger } from "@utils/logger";
import DbWorker from "@db/db.worker?worker";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { DbWorkerMessage, TargetFunctionName } from "./db.worker.types";

vi.mock("@utils/logger", () => ({
  customLogger: {
    finished: vi.fn(),
  },
}));

type Listener = (event: unknown) => void;

// Stands in for the Worker, which happy-dom does not have. The test decides
// which event the worker sends back.
class FakeWorker {
  static last: FakeWorker;
  listeners: Record<string, Listener[]> = {};
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.last = this;
  }
  addEventListener(type: string, listener: Listener): void {
    (this.listeners[type] ??= []).push(listener);
  }
  emit(type: string, event: unknown): void {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
}

vi.mock("@db/db.worker?worker", () => ({
  default: vi.fn().mockImplementation(function () {
    return new FakeWorker();
  }),
}));

const dbWorkerMessage: DbWorkerMessage<TargetFunctionName> = {
  targetFunctionName: "getConvertedEventLogs",
  params: undefined,
};

describe("startDbWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should resolve with the value from the worker", async () => {
    const result = startDbWorker(dbWorkerMessage);
    FakeWorker.last.emit("message", {
      data: { value: "test value", log: "test log" },
    });

    await expect(result).resolves.toBe("test value");
    expect(DbWorker).toHaveBeenCalledTimes(1);
    expect(FakeWorker.last.postMessage).toHaveBeenCalledWith(dbWorkerMessage);
    expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(1);
    expect(customLogger.finished).toHaveBeenCalledWith("test log");
  });

  test("should reject when the function in the worker failed", async () => {
    const result = startDbWorker(dbWorkerMessage);
    FakeWorker.last.emit("message", {
      data: { error: "test error", log: "test log" },
    });

    await expect(result).rejects.toThrow("test log: test error");
    expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(1);
    expect(customLogger.finished).not.toHaveBeenCalled();
  });

  test("should reject on an error event", async () => {
    const result = startDbWorker(dbWorkerMessage);
    FakeWorker.last.emit("error", { message: "script error" });

    await expect(result).rejects.toThrow(
      "DbWorker: getConvertedEventLogs: script error",
    );
    expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(1);
  });

  test("should reject on a messageerror event", async () => {
    const result = startDbWorker(dbWorkerMessage);
    FakeWorker.last.emit("messageerror", {});

    await expect(result).rejects.toThrow(
      "DbWorker: getConvertedEventLogs: could not read the message",
    );
    expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(1);
  });
});
