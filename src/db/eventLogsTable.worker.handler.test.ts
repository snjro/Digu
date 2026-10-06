import { afterEach, describe, expect, test, vi } from "vitest";
import { customLogger } from "#utils/logger.js";
import type { AbiFragmentIdentifier } from "./dbTypes";
import type {
  EventLogsTableQuery,
  EventLogsTableQueryResult,
  EventLogsTableRefreshResult,
  EventLogsTableState,
} from "./eventLogsTable";
import { createEventLogsTableRequestHandler } from "./eventLogsTable.worker.handler";
import type {
  EventLogsTableWorkerMessage,
  EventLogsTableWorkerResult,
} from "./eventLogsTable.worker.types";

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
const state: EventLogsTableState = { rowCount: 2, argsMaxLengths: [1] };
const queryResult: EventLogsTableQueryResult = { rows: [], lastRow: 2 };
const refreshResult: EventLogsTableRefreshResult = {
  ...state,
  reloaded: false,
};

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fakeTable() {
  return {
    open: vi.fn<() => Promise<EventLogsTableState>>(),
    query: vi.fn<(query: EventLogsTableQuery) => EventLogsTableQueryResult>(),
    refresh: vi.fn<() => Promise<EventLogsTableRefreshResult>>(),
  };
}
// Waits until the handler has done all the requests it can.
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createEventLogsTableRequestHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("handles the requests in their order, one at a time", async () => {
    const table = fakeTable();
    const opened = deferred<EventLogsTableState>();
    table.open.mockReturnValue(opened.promise);
    table.query.mockReturnValue(queryResult);
    table.refresh.mockResolvedValue(refreshResult);
    const posted: EventLogsTableWorkerResult[] = [];
    const handle = createEventLogsTableRequestHandler(
      (result) => posted.push(result),
      () => table,
    );

    handle({ id: 0, type: "open", params: { eventIdentifier } });
    handle({ id: 1, type: "query", params: query });
    handle({ id: 2, type: "refresh", params: undefined });
    await settle();
    // The query waits for the table to be read.
    expect(table.query).not.toHaveBeenCalled();
    expect(posted).toEqual([]);

    opened.resolve(state);
    await settle();
    expect(table.query).toHaveBeenCalledWith(query);
    expect(posted).toEqual([
      { id: 0, value: state },
      { id: 1, value: queryResult },
      { id: 2, value: refreshResult },
    ]);
  });

  test("posts the error of a request and goes on with the next", async () => {
    const table = fakeTable();
    table.open.mockResolvedValue(state);
    table.refresh.mockRejectedValue(new Error("refresh failed"));
    table.query.mockReturnValue(queryResult);
    const posted: EventLogsTableWorkerResult[] = [];
    const handle = createEventLogsTableRequestHandler(
      (result) => posted.push(result),
      () => table,
    );

    handle({ id: 0, type: "open", params: { eventIdentifier } });
    handle({ id: 1, type: "refresh", params: undefined });
    handle({ id: 2, type: "query", params: query });
    await settle();

    expect(posted).toEqual([
      { id: 0, value: state },
      { id: 1, error: "refresh failed" },
      { id: 2, value: queryResult },
    ]);
  });

  test("goes on with the next request when post() throws", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    const table = fakeTable();
    table.open.mockResolvedValue(state);
    table.query.mockReturnValue(queryResult);
    const posted: EventLogsTableWorkerResult[] = [];
    let failsToPost: number = 2;
    const handle = createEventLogsTableRequestHandler(
      (result) => {
        // The response and then the error of the first request.
        if (failsToPost-- > 0) throw new Error("could not clone");
        posted.push(result);
      },
      () => table,
    );

    handle({ id: 0, type: "open", params: { eventIdentifier } });
    handle({ id: 1, type: "query", params: query });
    await settle();

    expect(posted).toEqual([{ id: 1, value: queryResult }]);
    expect(customLogger.error).toHaveBeenCalledTimes(1);
  });

  test("posts the error when only the response cannot be posted", async () => {
    const table = fakeTable();
    table.open.mockResolvedValue(state);
    const posted: EventLogsTableWorkerResult[] = [];
    const handle = createEventLogsTableRequestHandler(
      (result) => {
        // A response that cannot be cloned, for example.
        if ("value" in result) throw new Error("could not clone");
        posted.push(result);
      },
      () => table,
    );

    handle({ id: 0, type: "open", params: { eventIdentifier } });
    await settle();

    expect(posted).toEqual([{ id: 0, error: "could not clone" }]);
  });

  test("answers a query before open with an error", async () => {
    const posted: EventLogsTableWorkerResult[] = [];
    const handle = createEventLogsTableRequestHandler(
      (result) => posted.push(result),
      () => fakeTable(),
    );

    handle({ id: 0, type: "query", params: query });
    await settle();

    expect(posted).toEqual([
      { id: 0, error: "EventLogsTable: no table is open" },
    ]);
  });

  test("drops the previous table when it opens another", async () => {
    const first = fakeTable();
    first.open.mockResolvedValue(state);
    const second = fakeTable();
    second.open.mockRejectedValue(new Error("open failed"));
    const tables = [first, second];
    const posted: EventLogsTableWorkerResult[] = [];
    const handle = createEventLogsTableRequestHandler(
      (result) => posted.push(result),
      () => tables.shift()!,
    );
    const messages: EventLogsTableWorkerMessage[] = [
      { id: 0, type: "open", params: { eventIdentifier } },
      { id: 1, type: "open", params: { eventIdentifier } },
      { id: 2, type: "query", params: query },
    ];

    messages.forEach(handle);
    await settle();

    expect(posted).toEqual([
      { id: 0, value: state },
      { id: 1, error: "open failed" },
      { id: 2, error: "EventLogsTable: no table is open" },
    ]);
    expect(first.query).not.toHaveBeenCalled();
  });
});
