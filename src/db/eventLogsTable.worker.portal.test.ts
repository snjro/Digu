import { beforeEach, describe, expect, test, vi } from "vitest";
import EventLogsTableWorker from "#db/eventLogsTable.worker.js?worker";
import type { AbiFragmentIdentifier } from "./dbTypes";
import type { EventLogsTableQuery } from "./eventLogsTable";
import { EventLogsTableClient } from "./eventLogsTable.worker.portal";

type Listener = (event: unknown) => void;

// Stands in for the Worker, which happy-dom does not have. The test decides
// what the worker sends back.
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

vi.mock("#db/eventLogsTable.worker.js?worker", () => ({
  default: vi.fn().mockImplementation(function () {
    return new FakeWorker();
  }),
}));

const eventIdentifier = {
  abiFragmentName: "Event",
} as AbiFragmentIdentifier;
const query: EventLogsTableQuery = {
  sortModel: [],
  filterModel: {},
  quickSearch: "",
  startRow: 0,
  endRow: 100,
};

describe("EventLogsTableClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("numbers the requests and resolves each with its response", async () => {
    const client = new EventLogsTableClient();
    const opened = client.open(eventIdentifier);
    const queried = client.query(query);
    const refreshed = client.refresh();

    expect(EventLogsTableWorker).toHaveBeenCalledTimes(1);
    expect(FakeWorker.last.postMessage.mock.calls).toEqual([
      [{ id: 0, type: "open", params: { eventIdentifier } }],
      [{ id: 1, type: "query", params: query }],
      [{ id: 2, type: "refresh", params: undefined }],
    ]);
    // Each response finds its request by the id.
    FakeWorker.last.emit("message", {
      data: { id: 1, value: { rows: [], lastRow: 0 } },
    });
    FakeWorker.last.emit("message", {
      data: { id: 0, value: { rowCount: 0, argsMaxLengths: [] } },
    });
    FakeWorker.last.emit("message", { data: { id: 2, error: "failed" } });

    await expect(opened).resolves.toEqual({ rowCount: 0, argsMaxLengths: [] });
    await expect(queried).resolves.toEqual({ rows: [], lastRow: 0 });
    await expect(refreshed).rejects.toThrow("EventLogsTableWorker: failed");
  });

  test("rejects the requests that wait when the worker fails", async () => {
    const client = new EventLogsTableClient();
    const opened = client.open(eventIdentifier);

    FakeWorker.last.emit("error", { message: "worker failed" });

    await expect(opened).rejects.toThrow("EventLogsTableWorker: worker failed");
  });

  test("rejects the requests that wait when the message cannot be read", async () => {
    const client = new EventLogsTableClient();
    const queried = client.query(query);

    FakeWorker.last.emit("messageerror", {});

    await expect(queried).rejects.toThrow(
      "EventLogsTableWorker: could not read the message",
    );
  });

  test("stops the worker and rejects the requests that wait", async () => {
    const client = new EventLogsTableClient();
    const opened = client.open(eventIdentifier);

    client.terminate();

    expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(1);
    await expect(opened).rejects.toThrow("EventLogsTableWorker: terminated");
  });
});
