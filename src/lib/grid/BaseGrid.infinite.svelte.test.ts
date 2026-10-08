import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import type { GridApi, IDatasource, IGetRowsParams } from "ag-grid-community";
import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
import BaseGrid from "./BaseGrid.svelte";
import BaseGridTestHost from "./BaseGrid.testHost.svelte";
import type { InfiniteRows } from "./infiniteRows";

// The real ag-grid with the function bar, as the event logs table.
vi.mock("$app/state", () => ({ page: { params: {} } }));

type Row = { id: number; name: string };
const rows: Row[] = [
  { id: 1, name: "apple" },
  { id: 2, name: "banana" },
];
// Answers each block with the rows whose name has the quick search, and
// keeps the text of each request.
function datasourceOf(quickSearch: {
  text: string;
}): IDatasource & { texts: string[]; api?: GridApi } {
  const texts: string[] = [];
  const datasource: IDatasource & { texts: string[]; api?: GridApi } = {
    texts,
    getRows: (params: IGetRowsParams) => {
      datasource.api = params.api;
      texts.push(quickSearch.text);
      const matched: Row[] = rows.filter((row) =>
        row.name.includes(quickSearch.text),
      );
      params.successCallback(
        matched.slice(params.startRow, params.endRow),
        matched.length,
      );
    },
  };
  return datasource;
}
function infiniteRowsOf(
  quickSearch: { text: string },
  datasource: IDatasource,
): InfiniteRows<unknown> {
  return {
    datasource,
    getRowId: ({ data }) => String((data as Row).id),
    quickSearch,
    csv: undefined,
    rowCounts: { all: undefined, filteredAndSorted: undefined },
  };
}
function renderGrid(quickSearch: { text: string }, datasource: IDatasource) {
  return render(BaseGrid, {
    paramColumnDefs: [{ colId: "name", field: "name" }],
    infiniteRows: infiniteRowsOf(quickSearch, datasource),
    exportFilePrefix: "eventLogs",
    hasMultipleTabs: false,
  });
}
// Lets the grid ask for the blocks that it would, then counts them.
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
async function typeQuickSearch(value: string): Promise<void> {
  await fireEvent.input(screen.getByRole("textbox", { name: "Quick search" }), {
    target: { value },
  });
}
function shownRowCount(container: HTMLElement): string {
  return (
    container
      .querySelector(".ag-paging-row-summary-panel")
      ?.textContent?.replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

beforeEach(() => {
  // Wide enough to show the buttons, not the three dots menu.
  storeNoDbCurrentWidth.set(4000);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("BaseGrid.svelte with the Infinite Row Model", () => {
  test("Reset all filters reads the rows again without the quick search, also with no column filter", async () => {
    const quickSearch = { text: "" };
    const datasource = datasourceOf(quickSearch);
    const infiniteRows: InfiniteRows<unknown> = {
      datasource,
      getRowId: ({ data }) => String((data as Row).id),
      quickSearch,
      csv: undefined,
      rowCounts: { all: undefined, filteredAndSorted: undefined },
    };
    const { container } = render(BaseGrid, {
      paramColumnDefs: [{ colId: "name", field: "name" }],
      infiniteRows,
      exportFilePrefix: "eventLogs",
      hasMultipleTabs: false,
    });
    await waitFor(() => expect(datasource.texts).toEqual([""]));
    await waitFor(() => expect(shownRowCount(container)).toMatch(/of 2$/));

    await typeQuickSearch("app");
    await waitFor(() => expect(datasource.texts.at(-1)).toBe("app"));
    await waitFor(() => expect(shownRowCount(container)).toMatch(/of 1$/));
    const requests: number = datasource.texts.length;

    await fireEvent.click(
      screen.getByRole("button", { name: "Reset all filters" }),
    );
    await waitFor(() =>
      expect(datasource.texts.length).toBeGreaterThan(requests),
    );
    expect(datasource.texts.slice(requests)).not.toContain("app");
    await waitFor(() => expect(shownRowCount(container)).toMatch(/of 2$/));
    expect(
      (
        screen.getByRole("textbox", {
          name: "Quick search",
        }) as HTMLInputElement
      ).value,
    ).toBe("");
    // The columns are sized after a frame and a timer.
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  test("Reset all filters with a column filter and the quick search reads the rows once", async () => {
    const quickSearch = { text: "" };
    const datasource = datasourceOf(quickSearch);
    const { container } = renderGrid(quickSearch, datasource);
    await waitFor(() => expect(datasource.texts).toEqual([""]));
    datasource.api?.setFilterModel({
      name: { filterType: "text", type: "contains", filter: "a" },
    });
    await waitFor(() => expect(datasource.texts).toHaveLength(2));
    await typeQuickSearch("app");
    await waitFor(() => expect(datasource.texts.at(-1)).toBe("app"));
    await settle();
    const requests: number = datasource.texts.length;

    await fireEvent.click(
      screen.getByRole("button", { name: "Reset all filters" }),
    );
    await waitFor(() => expect(shownRowCount(container)).toMatch(/of 2$/));
    await settle();
    expect(datasource.texts.slice(requests)).toEqual([""]);
    expect(datasource.api?.getFilterModel()).toEqual({});
  });

  test("Reset all filters with nothing set does not read the rows", async () => {
    const quickSearch = { text: "" };
    const datasource = datasourceOf(quickSearch);
    renderGrid(quickSearch, datasource);
    await waitFor(() => expect(datasource.texts).toEqual([""]));
    await settle();

    await fireEvent.click(
      screen.getByRole("button", { name: "Reset all filters" }),
    );
    await settle();
    expect(datasource.texts).toEqual([""]);
  });

  test("a grid made again does not call the destroyed grid from before", async () => {
    const warnings: string[] = [];
    for (const method of ["warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        warnings.push(args.map(String).join(" "));
      });
    }
    const quickSearch = { text: "" };
    const datasource = datasourceOf(quickSearch);
    const { rerender } = render(BaseGridTestHost, {
      infiniteRows: infiniteRowsOf(quickSearch, datasource),
      shown: true,
    });
    await settle();
    expect(screen.getByTestId("gridApi").textContent).toBe("live");
    // A text left in the quick search makes the new bar read the rows again.
    await typeQuickSearch("app");
    await waitFor(() => expect(quickSearch.text).toBe("app"));
    await settle();

    await rerender({ shown: false });
    expect(screen.getByTestId("gridApi").textContent).toBe("none");
    await rerender({ shown: true });
    await settle();
    expect(screen.getByTestId("gridApi").textContent).toBe("live");
    expect(warnings.filter((warning) => warning.includes("#26"))).toEqual([]);
    // The new grid reads its rows without the text of the grid before.
    expect(datasource.texts.at(-1)).toBe("");
  });
});
