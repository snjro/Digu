import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import type { GridApi } from "ag-grid-community";
import GridBody from "./GridBody.svelte";

const gridApi = vi.hoisted(() => ({
  setGridOption: vi.fn(),
  hideOverlay: vi.fn(),
  showNoRowsOverlay: vi.fn(),
  refreshCells: vi.fn(),
  sizeColumnsToFit: vi.fn(),
  autoSizeAllColumns: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("ag-grid-community", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ag-grid-community")>()),
  createGrid: vi.fn(() => gridApi),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function loadingCalls(): { value: boolean; order: number }[] {
  return gridApi.setGridOption.mock.calls.flatMap((call, index) =>
    call[0] === "loading"
      ? [
          {
            value: call[1] as boolean,
            order: gridApi.setGridOption.mock.invocationCallOrder[index],
          },
        ]
      : [],
  );
}
function lastLoading(): boolean | undefined {
  return loadingCalls().at(-1)?.value;
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
    // While loading is true, ag-grid shows no other overlay.
    expect(
      gridApi.showNoRowsOverlay.mock.invocationCallOrder.at(-1),
    ).toBeGreaterThan(loadingCalls().at(-1)!.order);
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
});
