import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import type { IDatasource, IGetRowsParams } from "ag-grid-community";
import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
import BaseGrid from "./BaseGrid.svelte";
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
}): IDatasource & { texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    getRows: (params: IGetRowsParams) => {
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
});
