import { beforeEach, describe, expect, test, vi } from "vitest";
import type { IGetRowsParams } from "ag-grid-community";
import type { AbiFragmentIdentifier } from "#db/dbTypes.js";
import type { EventLogsTableClient } from "#db/eventLogsTable.worker.portal.js";
import { customLogger } from "#utils/logger.js";
import {
  createEventLogsDatasource,
  openEventLogsTable,
} from "./eventLogsDatasource";

vi.mock("#utils/logger.js", () => ({ customLogger: { error: vi.fn() } }));

const eventIdentifier = {
  abiFragmentName: "Transfer",
} as AbiFragmentIdentifier;
function fakeClient() {
  return {
    open: vi.fn(),
    query: vi.fn(),
    csv: vi.fn(),
  };
}
function getRowsParams(): IGetRowsParams {
  return {
    startRow: 0,
    endRow: 100,
    sortModel: [],
    filterModel: {},
    successCallback: vi.fn(),
    failCallback: vi.fn(),
  } as unknown as IGetRowsParams;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createEventLogsDatasource", () => {
  test("fails the block when the worker fails, and logs it while the table is open", async () => {
    const client = fakeClient();
    client.query.mockRejectedValue(new Error("query failed"));
    let isClosed: boolean = false;
    const datasource = createEventLogsDatasource(
      client as unknown as EventLogsTableClient,
      { text: "" },
      { onRowCount: vi.fn(), isClosed: () => isClosed },
    );

    const params = getRowsParams();
    datasource.getRows(params);
    await vi.waitFor(() => expect(params.failCallback).toHaveBeenCalled());
    expect(customLogger.error).toHaveBeenCalledTimes(1);

    // After the table closes, the client rejects every request.
    isClosed = true;
    const closedParams = getRowsParams();
    datasource.getRows(closedParams);
    await vi.waitFor(() =>
      expect(closedParams.failCallback).toHaveBeenCalled(),
    );
    expect(customLogger.error).toHaveBeenCalledTimes(1);
    expect(params.successCallback).not.toHaveBeenCalled();
  });

  test("the CSV of Filtered & Sorted has the latest query that the grid asked for", async () => {
    const client = fakeClient();
    // The block of the new sort is not answered yet.
    let answer: (value: { rows: []; lastRow: 0 }) => void = () => {};
    client.query.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const quickSearch = { text: "a" };
    const datasource = createEventLogsDatasource(
      client as unknown as EventLogsTableClient,
      quickSearch,
      { onRowCount: vi.fn(), isClosed: () => false },
    );
    const request = { maxRows: 1 } as never;

    // Before any block, the rows have no sort and no filter.
    await datasource.csv?.(request, "filteredAndSorted");
    const params = {
      ...getRowsParams(),
      sortModel: [{ colId: "logIndex", sort: "asc" as const }],
    };
    datasource.getRows(params);
    // The text typed after the request is not in the query yet.
    quickSearch.text = "b";
    await datasource.csv?.(request, "filteredAndSorted");
    answer({ rows: [], lastRow: 0 });
    await vi.waitFor(() => expect(params.successCallback).toHaveBeenCalled());
    expect(client.csv.mock.calls).toEqual([
      [request, { sortModel: [], filterModel: {}, quickSearch: "a" }],
      [
        request,
        {
          sortModel: [{ colId: "logIndex", sort: "asc" }],
          filterModel: {},
          quickSearch: "a",
        },
      ],
    ]);
  });
});

describe("openEventLogsTable", () => {
  test("gives undefined and logs it when the table cannot be read", async () => {
    const client = fakeClient();
    client.open.mockRejectedValue(new Error("open failed"));
    await expect(
      openEventLogsTable(
        client as unknown as EventLogsTableClient,
        eventIdentifier,
        new AbortController().signal,
      ),
    ).resolves.toBeUndefined();
    expect(customLogger.error).toHaveBeenCalledTimes(1);
  });

  test("passes on the error of a stopped open without logging it", async () => {
    const client = fakeClient();
    client.open.mockRejectedValue(new Error("terminated"));
    const controller = new AbortController();
    controller.abort();
    await expect(
      openEventLogsTable(
        client as unknown as EventLogsTableClient,
        eventIdentifier,
        controller.signal,
      ),
    ).rejects.toThrow("terminated");
    expect(customLogger.error).not.toHaveBeenCalled();
  });
});
