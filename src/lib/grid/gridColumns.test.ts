import type { GridApi } from "ag-grid-community";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setAllColumnGroupState, setAutoColumnWidth } from "./gridColumns";

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
