import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import type { GridApi } from "ag-grid-community";
import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
import BaseGridFunctionBar from "./BaseGridFunctionBar.svelte";

function createGridApi() {
  // ag-grid ignores hideOverlay and showNoRowsOverlay while loading is true.
  const state = { loading: false, overlayCallsWhileLoading: 0 };
  const onOverlayCall = () => {
    if (state.loading) state.overlayCallsWhileLoading++;
  };
  const gridApi = {
    state,
    setGridOption: vi.fn((key: string, value: unknown) => {
      if (key === "loading") state.loading = value as boolean;
    }),
    getGridOption: vi.fn((key: string) =>
      key === "loading" ? state.loading : undefined,
    ),
    resetQuickFilter: vi.fn(),
    setFilterModel: vi.fn(),
    hideOverlay: vi.fn(onOverlayCall),
    showNoRowsOverlay: vi.fn(onOverlayCall),
    applyColumnState: vi.fn(),
    resetColumnGroupState: vi.fn(),
    resetColumnState: vi.fn(),
    refreshCells: vi.fn(),
    sizeColumnsToFit: vi.fn(),
    autoSizeAllColumns: vi.fn(),
    getGridId: vi.fn(() => "grid"),
  };
  return gridApi as typeof gridApi & GridApi;
}

function renderBar(rows: object[] | undefined) {
  const gridApi = createGridApi();
  render(BaseGridFunctionBar, {
    gridApi,
    rows,
    isFullScreen: false,
    exportFilePrefix: "contracts",
  });
  return gridApi;
}

function lastLoading(gridApi: ReturnType<typeof createGridApi>) {
  return gridApi.setGridOption.mock.calls
    .filter((call) => call[0] === "loading")
    .at(-1)?.[1];
}

beforeEach(() => {
  // Wide enough to show the buttons, not the three dots menu.
  storeNoDbCurrentWidth.set(4000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("BaseGridFunctionBar.svelte", () => {
  test("Reset all filters clears the column filters and the quick search", async () => {
    const gridApi = renderBar([]);
    await fireEvent.input(
      screen.getByRole("textbox", { name: "Quick search" }),
      {
        target: { value: "abc" },
      },
    );
    expect(gridApi.setGridOption).toHaveBeenLastCalledWith(
      "quickFilterText",
      "abc",
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Reset all filters" }),
    );
    expect(gridApi.setFilterModel).toHaveBeenCalledWith(null);
    expect(gridApi.setGridOption).toHaveBeenLastCalledWith(
      "quickFilterText",
      "",
    );
  });

  test("Reload clears the column filters", async () => {
    vi.useFakeTimers();
    const gridApi = renderBar([{ name: "a" }]);
    await fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    vi.advanceTimersByTime(500);
    expect(gridApi.setFilterModel).toHaveBeenCalledWith(null);
    expect(lastLoading(gridApi)).toBe(false);
    expect(gridApi.state.overlayCallsWhileLoading).toBe(0);
  });

  test("Reload while rows are loading keeps the loading overlay", async () => {
    vi.useFakeTimers();
    const gridApi = renderBar(undefined);
    // GridBody shows the loading overlay while rows is undefined.
    gridApi.setGridOption("loading", true);
    gridApi.setGridOption.mockClear();
    await fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    vi.advanceTimersByTime(500);
    expect(lastLoading(gridApi)).toBe(true);
    // Turning loading off and on again would remake the spinner.
    expect(gridApi.setGridOption).not.toHaveBeenCalledWith("loading", false);
    expect(gridApi.showNoRowsOverlay).not.toHaveBeenCalled();
    expect(gridApi.state.overlayCallsWhileLoading).toBe(0);
  });

  test("Reload with no rows shows No data", async () => {
    vi.useFakeTimers();
    const gridApi = renderBar([]);
    await fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    vi.advanceTimersByTime(500);
    expect(lastLoading(gridApi)).toBe(false);
    expect(gridApi.showNoRowsOverlay).toHaveBeenCalled();
    expect(gridApi.state.overlayCallsWhileLoading).toBe(0);
  });
});
