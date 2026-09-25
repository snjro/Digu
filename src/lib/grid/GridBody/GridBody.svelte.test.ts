import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import type { GridApi } from "ag-grid-community";
import GridBody from "./GridBody.svelte";

const gridApi = vi.hoisted(() => {
  // ag-grid ignores hideOverlay and showNoRowsOverlay while loading is true.
  const state = { loading: false, overlayCallsWhileLoading: 0 };
  const onOverlayCall = () => {
    if (state.loading) state.overlayCallsWhileLoading++;
  };
  return {
    state,
    setGridOption: vi.fn((key: string, value: unknown) => {
      if (key === "loading") state.loading = value as boolean;
    }),
    getGridOption: vi.fn((key: string) =>
      key === "loading" ? state.loading : undefined,
    ),
    hideOverlay: vi.fn(onOverlayCall),
    showNoRowsOverlay: vi.fn(onOverlayCall),
    refreshCells: vi.fn(),
    sizeColumnsToFit: vi.fn(),
    autoSizeAllColumns: vi.fn(),
    destroy: vi.fn(),
  };
});

vi.mock("ag-grid-community", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ag-grid-community")>()),
  createGrid: vi.fn(() => gridApi),
}));

afterEach(() => {
  const overlayCallsWhileLoading: number =
    gridApi.state.overlayCallsWhileLoading;
  vi.clearAllMocks();
  gridApi.state.loading = false;
  gridApi.state.overlayCallsWhileLoading = 0;
  expect(overlayCallsWhileLoading).toBe(0);
});

function lastLoading(): boolean | undefined {
  return gridApi.setGridOption.mock.calls
    .filter((call) => call[0] === "loading")
    .at(-1)?.[1] as boolean | undefined;
}

// The component replaces gridApi with the one createGrid returns. Passing
// the same one, like bind:gridApi, keeps it when the props change.
function renderGridBody(rows: object[] | undefined) {
  return render(GridBody, { gridApi: gridApi as unknown as GridApi, rows });
}

describe("GridBody.svelte", () => {
  test("rows undefined: shows the loading overlay, not No data", () => {
    renderGridBody(undefined);
    expect(lastLoading()).toBe(true);
    expect(gridApi.showNoRowsOverlay).not.toHaveBeenCalled();
  });

  test("empty rows: clears loading, then shows No data", () => {
    renderGridBody([]);
    expect(lastLoading()).toBe(false);
    expect(gridApi.setGridOption).toHaveBeenCalledWith("rowData", []);
    expect(gridApi.showNoRowsOverlay).toHaveBeenCalled();
  });

  test("rows: sets them and clears loading", () => {
    const rows = [{ name: "a" }];
    renderGridBody(rows);
    expect(gridApi.setGridOption).toHaveBeenCalledWith("rowData", rows);
    expect(lastLoading()).toBe(false);
    expect(gridApi.showNoRowsOverlay).not.toHaveBeenCalled();
  });

  test("rows undefined then empty: loading ends with No data", async () => {
    const { rerender } = renderGridBody(undefined);
    expect(lastLoading()).toBe(true);
    await rerender({ rows: [] });
    expect(lastLoading()).toBe(false);
    expect(gridApi.showNoRowsOverlay).toHaveBeenCalled();
  });

  test("rows undefined then rows: loading ends with the rows", async () => {
    const rows = [{ name: "a" }];
    const { rerender } = renderGridBody(undefined);
    await rerender({ rows });
    expect(gridApi.setGridOption).toHaveBeenCalledWith("rowData", rows);
    expect(lastLoading()).toBe(false);
    expect(gridApi.showNoRowsOverlay).not.toHaveBeenCalled();
  });
});
