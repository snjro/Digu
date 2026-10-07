import type { GridApi } from "ag-grid-community";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  setAllColumnGroupState,
  setAutoColumnWidth,
  setAutoColumnWidthWhenRowsCome,
} from "./gridColumns";

function createGridApi(groupIds: string[] = []) {
  const gridApi = {
    sizeColumnsToFit: vi.fn(),
    autoSizeAllColumns: vi.fn(),
    getColumnGroupState: vi.fn(() =>
      groupIds.map((groupId) => ({ groupId, open: false })),
    ),
    setColumnGroupState: vi.fn(),
  };
  return gridApi as typeof gridApi & GridApi;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("setAutoColumnWidth", () => {
  test("fits the columns now and auto-sizes them after the wait", () => {
    const gridApi = createGridApi();
    setAutoColumnWidth(gridApi);
    expect(gridApi.sizeColumnsToFit).toHaveBeenCalledWith(0);
    expect(gridApi.autoSizeAllColumns).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(gridApi.autoSizeAllColumns).toHaveBeenCalledWith(false);
  });
  test("passes skipHeader and waits the given time", () => {
    const gridApi = createGridApi();
    setAutoColumnWidth(gridApi, true, 100);
    vi.advanceTimersByTime(99);
    expect(gridApi.autoSizeAllColumns).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(gridApi.autoSizeAllColumns).toHaveBeenCalledWith(true);
  });
});

describe("setAllColumnGroupState", () => {
  test("open: opens every group and auto-sizes the columns", () => {
    const gridApi = createGridApi(["a", "b"]);
    setAllColumnGroupState(gridApi, true);
    expect(gridApi.setColumnGroupState).toHaveBeenCalledWith([
      { groupId: "a", open: true },
      { groupId: "b", open: true },
    ]);
    expect(gridApi.sizeColumnsToFit).toHaveBeenCalledWith(0);
    vi.runAllTimers();
    expect(gridApi.autoSizeAllColumns).toHaveBeenCalledWith(false);
  });
  test("close: closes every group and does not resize the columns", () => {
    const gridApi = createGridApi(["a", "b"]);
    setAllColumnGroupState(gridApi, false);
    expect(gridApi.setColumnGroupState).toHaveBeenCalledWith([
      { groupId: "a", open: false },
      { groupId: "b", open: false },
    ]);
    vi.runAllTimers();
    expect(gridApi.sizeColumnsToFit).not.toHaveBeenCalled();
    expect(gridApi.autoSizeAllColumns).not.toHaveBeenCalled();
  });
});

describe("setAutoColumnWidthWhenRowsCome", () => {
  // A grid of the Infinite Row Model: the rows of the shown page have data
  // only after the datasource answers.
  function createInfiniteGridApi() {
    const listeners: (() => void)[] = [];
    const state = { rowCount: 1, hasData: false, page: 2, pageSize: 20 };
    const gridApi = {
      ...createGridApi(),
      state,
      listeners,
      addEventListener: vi.fn((_: string, listener: () => void) => {
        listeners.push(listener);
      }),
      removeEventListener: vi.fn((_: string, listener: () => void) => {
        listeners.splice(listeners.indexOf(listener), 1);
      }),
      getDisplayedRowCount: vi.fn(() => state.rowCount),
      paginationGetCurrentPage: vi.fn(() => state.page),
      paginationGetPageSize: vi.fn(() => state.pageSize),
      getDisplayedRowAtIndex: vi.fn((index: number) =>
        index === state.page * state.pageSize
          ? { data: state.hasData ? {} : undefined }
          : undefined,
      ),
      // As ag-grid after the cache or the rows change.
      updateModel() {
        for (const listener of [...listeners]) listener();
      },
    };
    return gridApi as typeof gridApi & GridApi;
  }

  test("sizes the columns after the first row of the page has data, once", () => {
    const gridApi = createInfiniteGridApi();
    setAutoColumnWidthWhenRowsCome(gridApi);
    expect(gridApi.addEventListener).toHaveBeenCalledWith(
      "modelUpdated",
      expect.any(Function),
    );
    // The purge: the rows are still loading.
    gridApi.updateModel();
    vi.runAllTimers();
    expect(gridApi.sizeColumnsToFit).not.toHaveBeenCalled();

    gridApi.state.hasData = true;
    gridApi.updateModel();
    expect(gridApi.sizeColumnsToFit).toHaveBeenCalledWith(0);
    vi.runAllTimers();
    expect(gridApi.autoSizeAllColumns).toHaveBeenCalledTimes(1);
    expect(gridApi.listeners).toHaveLength(0);

    gridApi.updateModel();
    expect(gridApi.sizeColumnsToFit).toHaveBeenCalledTimes(1);
  });

  test("sizes the columns when there are no rows", () => {
    const gridApi = createInfiniteGridApi();
    setAutoColumnWidthWhenRowsCome(gridApi);
    gridApi.state.rowCount = 0;
    gridApi.updateModel();
    expect(gridApi.sizeColumnsToFit).toHaveBeenCalledWith(0);
    expect(gridApi.listeners).toHaveLength(0);
  });
});
