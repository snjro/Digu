import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import type { GridApi } from "ag-grid-community";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";
import ExportCsv from "./ExportCsv.svelte";

vi.mock("$app/state", () => ({ page: { params: {} } }));

function createGridApi(gridId: string) {
  const columns = [ColIdRowSequenceNumber, "name"].map((colId) => ({
    getColId: () => colId,
  }));
  const gridApi = {
    getGridId: vi.fn(() => gridId),
    getColumns: vi.fn(() => columns),
    getAllDisplayedColumns: vi.fn(() => columns),
    exportDataAsCsv: vi.fn(),
  };
  return gridApi as typeof gridApi & GridApi;
}

describe("ExportCsv.svelte", () => {
  test("keeps the selected values when the grid id changes", async () => {
    const { rerender } = render(ExportCsv, {
      gridApi: createGridApi("1"),
      exportFilePrefix: "contracts",
    });
    await fireEvent.click(document.getElementById("includeRowNumberNo1")!);

    const gridApi = createGridApi("2");
    await rerender({ gridApi });
    await fireEvent.click(
      screen.getByRole("button", { name: "Export", hidden: true }),
    );
    expect(gridApi.exportDataAsCsv).toHaveBeenCalledWith(
      expect.objectContaining({ columnKeys: ["name"] }),
    );
  });

  test("Export and Copy do nothing before the grid is created", async () => {
    render(ExportCsv, { gridApi: undefined, exportFilePrefix: "contracts" });
    for (const name of ["Export", "Copy"]) {
      await fireEvent.click(screen.getByRole("button", { name, hidden: true }));
    }
  });
});
