import { describe, expect, test } from "vitest";
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type ColDef,
  type IRowNode,
  type ValueGetterParams,
} from "ag-grid-community";
import { ColIdRowSequenceNumber, getColumnDefs } from "./getColumnDefs";

function rowNumberColumnDef(): ColDef {
  return getColumnDefs([{ field: "a" }])[0] as ColDef;
}

function rowNumber(rowIndex: number | null): unknown {
  const valueGetter = rowNumberColumnDef().valueGetter;
  if (typeof valueGetter !== "function") {
    throw new Error("valueGetter is not a function");
  }
  return valueGetter({
    node: { rowIndex } as IRowNode,
  } as ValueGetterParams);
}

describe("getColumnDefs", () => {
  test("adds the row number column first", () => {
    expect(rowNumberColumnDef().colId).toBe(ColIdRowSequenceNumber);
  });

  // A string expression would need new Function, which a CSP without
  // 'unsafe-eval' blocks.
  test("the row number valueGetter is a function", () => {
    expect(typeof rowNumberColumnDef().valueGetter).toBe("function");
  });

  test.each([
    [0, 1],
    [5, 6],
    // Same as the former string expression "node.rowIndex + 1": null + 1.
    [null, 1],
  ])("rowIndex %s gives row number %s", (rowIndex, expected) => {
    expect(rowNumber(rowIndex)).toBe(expected);
  });

  // The row number is the position on the screen, so matching it would make
  // the result depend on the earlier searches.
  test("the quick search does not match the row number", () => {
    ModuleRegistry.registerModules([AllCommunityModule]);
    const element = document.createElement("div");
    document.body.append(element);
    const gridApi = createGrid(element, {
      columnDefs: getColumnDefs([{ field: "name" }]),
      rowData: ["a", "b", "c3", "d"].map((name) => ({ name })),
    });
    const shownNames = (): string[] => {
      const names: string[] = [];
      gridApi.forEachNodeAfterFilterAndSort((node) => {
        names.push(node.data.name);
      });
      return names;
    };
    // "b" is row 2 and "d" is row 4.
    gridApi.setGridOption("quickFilterText", "2");
    expect(shownNames()).toEqual([]);
    gridApi.setGridOption("quickFilterText", "3");
    expect(shownNames()).toEqual(["c3"]);
    gridApi.destroy();
  });
});
