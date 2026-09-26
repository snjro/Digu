import { describe, expect, test } from "vitest";
import type { ColDef, IRowNode, ValueGetterParams } from "ag-grid-community";
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
});
