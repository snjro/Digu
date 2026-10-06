import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { createGrid, type GridApi, type IDatasource } from "ag-grid-community";
import type { InfiniteRows } from "../infiniteRows";
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

  test("passes the loading text to the overlay only when it changes", async () => {
    const paramsCalls = () =>
      gridApi.setGridOption.mock.calls
        .filter((call) => call[0] === "loadingOverlayComponentParams")
        .map((call) => call[1]);
    // Without it, the overlay is not mounted again.
    const { rerender } = renderGridBody(undefined);
    expect(paramsCalls()).toEqual([]);
    await rerender({ loadingText: "Waiting" });
    await rerender({ loadingText: "Waiting", rows: [] });
    await rerender({ loadingText: undefined });
    expect(paramsCalls()).toEqual([
      { loadingText: "Waiting" },
      { loadingText: undefined },
    ]);
  });

  describe("with the Infinite Row Model", () => {
    function infiniteRowsOf(
      datasource: IDatasource | undefined,
    ): InfiniteRows<unknown> {
      return {
        datasource,
        getRowId: ({ data }) => String((data as { id: number }).id),
        quickSearch: { text: "" },
        csv: undefined,
        rowCounts: { all: undefined, filteredAndSorted: undefined },
      };
    }
    function renderInfinite(infiniteRows: InfiniteRows<unknown>) {
      return render(GridBody, {
        gridApi: gridApi as unknown as GridApi,
        infiniteRows,
      });
    }
    function datasourceCalls() {
      return gridApi.setGridOption.mock.calls.filter(
        (call) => call[0] === "datasource",
      );
    }

    test("creates the grid with the options of the Infinite Row Model", () => {
      const infiniteRows = infiniteRowsOf(undefined);
      renderInfinite(infiniteRows);
      const options = vi.mocked(createGrid).mock.calls.at(-1)![1];
      expect(options).toMatchObject({
        rowModelType: "infinite",
        getRowId: infiniteRows.getRowId,
        maxBlocksInCache: 10,
      });
      // The quick search counts as a filter, for the overlay of no rows.
      expect(options.isExternalFilterPresent?.({} as never)).toBe(false);
      infiniteRows.quickSearch.text = "a";
      expect(options.isExternalFilterPresent?.({} as never)).toBe(true);
    });

    test("no datasource: shows the loading overlay and sets no rows", () => {
      renderInfinite(infiniteRowsOf(undefined));
      expect(lastLoading()).toBe(true);
      expect(datasourceCalls()).toEqual([]);
      expect(gridApi.setGridOption).not.toHaveBeenCalledWith(
        "rowData",
        expect.anything(),
      );
    });

    test("a datasource: clears loading and gives it to the grid once", async () => {
      const datasource: IDatasource = { getRows: vi.fn() };
      const { rerender } = renderInfinite(infiniteRowsOf(undefined));
      await rerender({ infiniteRows: infiniteRowsOf(datasource) });
      expect(lastLoading()).toBe(false);
      expect(datasourceCalls()).toEqual([["datasource", datasource]]);

      // The same datasource with other values does not read the rows again.
      await rerender({
        infiniteRows: { ...infiniteRowsOf(datasource), csv: vi.fn() },
      });
      expect(datasourceCalls()).toHaveLength(1);
    });

    test("another datasource after the loading overlay", async () => {
      const first: IDatasource = { getRows: vi.fn() };
      const second: IDatasource = { getRows: vi.fn() };
      const { rerender } = renderInfinite(infiniteRowsOf(first));
      await rerender({ infiniteRows: infiniteRowsOf(undefined) });
      expect(lastLoading()).toBe(true);
      await rerender({ infiniteRows: infiniteRowsOf(second) });
      expect(lastLoading()).toBe(false);
      expect(datasourceCalls()).toEqual([
        ["datasource", first],
        ["datasource", second],
      ]);
    });
  });
});
