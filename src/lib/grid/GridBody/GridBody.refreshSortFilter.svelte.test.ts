import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import type { GridApi, ValueGetterParams } from "ag-grid-community";
import { get, writable, type Writable } from "svelte/store";
import GridBody, { REFRESH_SORT_FILTER_INTERVAL_MS } from "./GridBody.svelte";

// The real ag-grid. As the sync status columns, the column "value" reads a
// store, and the rows stay the same when the store changes.
type Row = { id: string };
const rows: Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }];

function renderGridBody(values: Writable<Record<string, number>>): {
  api: () => GridApi<Row>;
  container: HTMLElement;
  unmount: () => void;
} {
  let api: GridApi<Row> | undefined;
  const { container, unmount } = render(GridBody, {
    gridApi: undefined,
    paramColumnDefs: [
      {
        colId: "value",
        filter: "agNumberColumnFilter",
        valueGetter: (params: ValueGetterParams<Row>): number => {
          api = params.api;
          return get(values)[params.data!.id];
        },
      },
    ],
    rows,
    refreshSortFilterOn: [values],
  });
  return {
    api: () => {
      if (!api) throw new Error("The grid has not read a value yet.");
      return api;
    },
    container,
    unmount,
  };
}
function displayedIds(api: GridApi<Row>): string[] {
  const ids: string[] = [];
  api.forEachNodeAfterFilterAndSort((node) => ids.push(node.data!.id));
  return ids;
}
function rowSequenceNumbers(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[col-id="rowSequenceNumber"]')]
    .filter((cell) => cell.getAttribute("role") === "gridcell")
    .map((cell) => cell.textContent?.trim() ?? "");
}
const waitOptions = { timeout: REFRESH_SORT_FILTER_INTERVAL_MS * 3 };

let warnings: unknown[][] = [];
beforeEach(() => {
  warnings = [];
  for (const method of ["warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      warnings.push(args);
    });
  }
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("GridBody.svelte: refreshSortFilterOn", () => {
  test("sorts the same rows again when the store changes", async () => {
    const values = writable({ a: 1, b: 2, c: 3 });
    const grid = renderGridBody(values);
    await waitFor(() => expect(displayedIds(grid.api())).toHaveLength(3));
    grid.api().applyColumnState({ state: [{ colId: "value", sort: "desc" }] });
    expect(displayedIds(grid.api())).toEqual(["c", "b", "a"]);
    grid.api().getRowNode("0")?.setSelected(true);

    values.set({ a: 5, b: 2, c: 3 });
    await waitFor(
      () => expect(displayedIds(grid.api())).toEqual(["a", "c", "b"]),
      waitOptions,
    );
    expect(
      grid
        .api()
        .getSelectedNodes()
        .map((node) => node.data!.id),
    ).toEqual(["a"]);
    expect(warnings).toEqual([]);
  });

  test("filters the same rows again when the store changes", async () => {
    const values = writable({ a: 1, b: 2, c: 3 });
    const grid = renderGridBody(values);
    await waitFor(() => expect(displayedIds(grid.api())).toHaveLength(3));
    grid.api().setFilterModel({
      value: { filterType: "number", type: "greaterThan", filter: 1 },
    });
    await waitFor(() => expect(displayedIds(grid.api())).toEqual(["b", "c"]));

    values.set({ a: 4, b: 0, c: 3 });
    await waitFor(
      () => expect(displayedIds(grid.api())).toEqual(["a", "c"]),
      waitOptions,
    );
    expect(warnings).toEqual([]);
  });

  test("numbers the rows again after a sort", async () => {
    const values = writable({ a: 1, b: 2, c: 3 });
    const grid = renderGridBody(values);
    await waitFor(() => expect(displayedIds(grid.api())).toHaveLength(3));
    grid.api().applyColumnState({ state: [{ colId: "value", sort: "asc" }] });
    const container: HTMLElement = grid.container;
    await waitFor(() =>
      expect(rowSequenceNumbers(container).sort()).toEqual(["1", "2", "3"]),
    );

    values.set({ a: 9, b: 2, c: 3 });
    await waitFor(
      () => expect(displayedIds(grid.api())).toEqual(["b", "c", "a"]),
      waitOptions,
    );
    // Each displayed row shows its own position.
    for (const [index, id] of ["b", "c", "a"].entries()) {
      const rowElement: Element | null = container.querySelector(
        `[row-index="${index}"] [col-id="rowSequenceNumber"]`,
      );
      expect(rowElement?.textContent?.trim()).toBe(String(index + 1));
      expect(grid.api().getDisplayedRowAtIndex(index)?.data?.id).toBe(id);
    }
  });

  test("does not refresh the rows of a grid without a sort or a filter", async () => {
    const values = writable({ a: 1, b: 2, c: 3 });
    const grid = renderGridBody(values);
    await waitFor(() => expect(displayedIds(grid.api())).toHaveLength(3));
    const refresh = vi.spyOn(grid.api(), "refreshClientSideRowModel");

    values.set({ a: 5, b: 2, c: 3 });
    await new Promise((resolve) =>
      setTimeout(resolve, REFRESH_SORT_FILTER_INTERVAL_MS + 100),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  test("refreshes once for the changes in an interval, and stops on unmount", async () => {
    const values = writable({ a: 1, b: 2, c: 3 });
    const grid = renderGridBody(values);
    await waitFor(() => expect(displayedIds(grid.api())).toHaveLength(3));
    grid.api().applyColumnState({ state: [{ colId: "value", sort: "asc" }] });
    const api: GridApi<Row> = grid.api();
    const refresh = vi.spyOn(api, "refreshClientSideRowModel");

    for (let value = 4; value < 10; value++) {
      values.set({ a: value, b: 2, c: 3 });
    }
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1), waitOptions);

    values.set({ a: 0, b: 2, c: 3 });
    grid.unmount();
    await new Promise((resolve) =>
      setTimeout(resolve, REFRESH_SORT_FILTER_INTERVAL_MS + 100),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
