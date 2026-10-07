import type { GridApi } from "ag-grid-community";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  ROWS_WAIT_MS,
  setAllColumnGroupState,
  setAutoColumnWidth,
  setAutoColumnWidthWhenRowsCome,
} from "./gridColumns";

function createGridApi(groupIds: string[] = []) {
  const gridApi = {
    sizeColumnsToFit: vi.fn(),
    autoSizeAllColumns: vi.fn(),
    isDestroyed: vi.fn(() => false),
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
  test("does not auto-size a grid destroyed before the wait ends", () => {
    const gridApi = createGridApi();
    setAutoColumnWidth(gridApi, false, 100);
    vi.advanceTimersByTime(50);
    gridApi.isDestroyed.mockReturnValue(true);
    vi.advanceTimersByTime(50);
    expect(gridApi.autoSizeAllColumns).not.toHaveBeenCalled();
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
    const state = {
      rowCount: 1,
      hasData: false,
      page: 2,
      pageSize: 20,
      destroyed: false,
    };
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
      isDestroyed: vi.fn(() => state.destroyed),
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
    vi.advanceTimersByTime(1000);
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

  test("a new wait replaces the one before, so the listeners do not add up", () => {
    const gridApi = createInfiniteGridApi();
    for (let i = 0; i < 3; i++) setAutoColumnWidthWhenRowsCome(gridApi);
    expect(gridApi.listeners).toHaveLength(1);
    gridApi.state.hasData = true;
    gridApi.updateModel();
    expect(gridApi.sizeColumnsToFit).toHaveBeenCalledTimes(1);
    expect(gridApi.listeners).toHaveLength(0);
  });

  test("stops waiting for a block that never comes, such as one that failed", () => {
    const gridApi = createInfiniteGridApi();
    setAutoColumnWidthWhenRowsCome(gridApi);
    vi.advanceTimersByTime(ROWS_WAIT_MS);
    expect(gridApi.listeners).toHaveLength(0);
    // Rows that come later do not size the columns.
    gridApi.state.hasData = true;
    gridApi.updateModel();
    expect(gridApi.sizeColumnsToFit).not.toHaveBeenCalled();
  });

  test("stops waiting when the grid is destroyed", () => {
    const gridApi = createInfiniteGridApi();
    setAutoColumnWidthWhenRowsCome(gridApi);
    gridApi.state.destroyed = true;
    gridApi.state.hasData = true;
    gridApi.updateModel();
    expect(gridApi.sizeColumnsToFit).not.toHaveBeenCalled();
    // The listeners of a destroyed grid go with it; the timer is cleared.
    expect(vi.getTimerCount()).toBe(0);
  });
});
