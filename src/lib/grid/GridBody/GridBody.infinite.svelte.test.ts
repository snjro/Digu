import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import type { GridApi, IDatasource, IGetRowsParams } from "ag-grid-community";
import type { InfiniteRows } from "../infiniteRows";
import GridBody from "./GridBody.svelte";

// The real ag-grid, with its checks of the options and the modules on (the
// component turns them on in development).
type Row = { id: number; name: string };

function infiniteRowsOf(
  datasource: IDatasource | undefined,
  quickSearch: { text: string },
): InfiniteRows<unknown> {
  return {
    datasource,
    getRowId: ({ data }) => `row${(data as Row).id}`,
    quickSearch,
    csv: undefined,
    rowCounts: { all: undefined, filteredAndSorted: undefined },
  };
}
// Answers each block with the rows whose name has the quick search.
function datasourceOf(
  rows: Row[],
  quickSearch: { text: string },
): IDatasource & { calls: IGetRowsParams[] } {
  const calls: IGetRowsParams[] = [];
  return {
    calls,
    getRows: (params: IGetRowsParams) => {
      calls.push(params);
      const matched: Row[] = rows.filter((row) =>
        row.name.includes(quickSearch.text),
      );
      params.successCallback(
        matched.slice(params.startRow, params.endRow),
        matched.length,
      );
    },
  };
}
function renderGridBody(
  datasource: IDatasource,
  quickSearch: { text: string },
) {
  return render(GridBody, {
    gridApi: undefined,
    paramColumnDefs: [{ colId: "name", field: "name" }],
    infiniteRows: infiniteRowsOf(datasource, quickSearch),
  });
}
function overlayText(container: HTMLElement): string {
  return container.querySelector(".ag-overlay")?.textContent?.trim() ?? "";
}

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

describe("GridBody.svelte with the Infinite Row Model", () => {
  test("asks the datasource for the first block and shows its rows", async () => {
    const quickSearch = { text: "" };
    const rows: Row[] = Array.from({ length: 150 }, (_, index) => ({
      id: index + 1,
      name: `name${index}`,
    }));
    const datasource = datasourceOf(rows, quickSearch);
    renderGridBody(datasource, quickSearch);

    await waitFor(() => expect(datasource.calls.length).toBe(1));
    expect(datasource.calls[0]).toMatchObject({
      startRow: 0,
      endRow: 100,
      sortModel: [],
      filterModel: {},
    });
    const api = datasource.calls[0].api as GridApi<Row>;
    await waitFor(() => expect(api.getDisplayedRowCount()).toBe(150));
    expect(api.getDisplayedRowAtIndex(1)?.id).toBe("row2");
    expect(api.getGridOption("maxBlocksInCache")).toBe(10);
    // The columns are sized after a frame and a timer: the check below
    // covers the sizing too.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(warnings).toEqual([]);
  });

  test("keeps the selected row across a new sort, by the id of the row", async () => {
    const quickSearch = { text: "" };
    const rows: Row[] = Array.from({ length: 150 }, (_, index) => ({
      id: index + 1,
      name: `name${String(index).padStart(3, "0")}`,
    }));
    const datasource = datasourceOf(rows, quickSearch);
    // Sorts by the name, as the table worker sorts all the rows.
    const getRows = datasource.getRows;
    datasource.getRows = (params: IGetRowsParams) =>
      getRows({
        ...params,
        successCallback: (rowsThisBlock, lastRow) =>
          params.successCallback(
            params.sortModel[0]?.sort === "desc"
              ? rows.toReversed().slice(params.startRow, params.endRow)
              : rowsThisBlock,
            lastRow,
          ),
      });
    renderGridBody(datasource, quickSearch);
    await waitFor(() => expect(datasource.calls.length).toBe(1));
    const api = datasource.calls[0].api as GridApi<Row>;
    await waitFor(() => expect(api.getDisplayedRowCount()).toBe(150));

    api.getDisplayedRowAtIndex(1)?.setSelected(true);
    api.applyColumnState({ state: [{ colId: "name", sort: "desc" }] });
    await waitFor(() => expect(datasource.calls.length).toBe(2));
    await waitFor(() =>
      expect(api.getDisplayedRowAtIndex(0)?.id).toBe("row150"),
    );
    expect(api.getSelectedNodes().map((node) => node.id)).toEqual(["row2"]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(warnings).toEqual([]);
  });

  // As EventLogs.svelte after a refresh() that read all the rows again (for
  // example after a reset): fewer rows, with other ids.
  test("refreshInfiniteCache() shows the rows of a table that was read again", async () => {
    const quickSearch = { text: "" };
    const rows: Row[] = Array.from({ length: 250 }, (_, index) => ({
      id: index + 1,
      name: `name${index}`,
    }));
    const datasource = datasourceOf(rows, quickSearch);
    renderGridBody(datasource, quickSearch);
    await waitFor(() => expect(datasource.calls.length).toBe(1));
    const api = datasource.calls[0].api as GridApi<Row>;
    await waitFor(() => expect(api.getDisplayedRowCount()).toBe(250));
    // A block after the first one is in the cache too.
    api.getDisplayedRowAtIndex(150);
    await waitFor(() => expect(datasource.calls.length).toBe(2));

    rows.splice(
      0,
      rows.length,
      ...Array.from({ length: 30 }, (_, index) => ({
        id: 1001 + index,
        name: `new${index}`,
      })),
    );
    api.refreshInfiniteCache();
    await waitFor(() => expect(api.getDisplayedRowCount()).toBe(30));
    await waitFor(() =>
      expect(api.getDisplayedRowAtIndex(0)?.id).toBe("row1001"),
    );
    expect(api.getDisplayedRowAtIndex(29)?.data?.name).toBe("new29");
    expect(api.getDisplayedRowAtIndex(30)).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(warnings).toEqual([]);
  });

  test("tells no matching rows of the quick search from no rows, as ag-grid's own quick search", async () => {
    const quickSearch = { text: "" };
    const datasource = datasourceOf([{ id: 1, name: "apple" }], quickSearch);
    const { container } = renderGridBody(datasource, quickSearch);
    await waitFor(() => expect(datasource.calls.length).toBe(1));
    const api = datasource.calls[0].api as GridApi<Row>;

    // As the quick search of the function bar.
    quickSearch.text = "cherry";
    api.onFilterChanged();
    await waitFor(() => expect(datasource.calls.length).toBe(2));
    await waitFor(() =>
      expect(overlayText(container)).toBe("No Matching Rows"),
    );

    quickSearch.text = "";
    api.onFilterChanged();
    await waitFor(() => expect(datasource.calls.length).toBe(3));
    await waitFor(() => expect(overlayText(container)).toBe(""));

    const empty = datasourceOf([], quickSearch);
    api.setGridOption("datasource", empty);
    await waitFor(() => expect(empty.calls.length).toBe(1));
    await waitFor(() => expect(overlayText(container)).toBe("No data"));
    expect(warnings).toEqual([]);
  });
});
