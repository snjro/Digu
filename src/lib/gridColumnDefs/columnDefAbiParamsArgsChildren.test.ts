import { EventFragment, FunctionFragment } from "ethers";
import { describe, expect, test } from "vitest";
import type { ColDef, ValueGetterParams } from "ag-grid-community";
import { NO_DATA } from "#utils/utilsConstants.js";
import { columnDefAbiParamsArgsChildren } from "./columnDefAbiParamsArgsChildren";
import type { EventRow, FunctionRow } from "./rowTypes";
import type { AbiRow } from "./types";

const functionFragment = FunctionFragment.from(
  "function f((uint256 a, address b) s, (uint8 c, bool)[] t, uint256[] u, address) returns (uint256)",
);
// From JSON, like the ABIs of the app: a human readable ABI leaves "indexed"
// out when it is not indexed.
const eventFragment = EventFragment.from({
  type: "event",
  name: "E",
  inputs: [
    { type: "address", name: "from", indexed: true },
    { type: "uint256", name: "value", indexed: false },
  ],
});
const functionRow = {
  functionInputs: functionFragment.inputs,
  functionOutputs: functionFragment.outputs,
} as FunctionRow;
const eventRow = { eventInputs: eventFragment.inputs } as EventRow;

// The value of each column of the param at index.
function values<T extends AbiRow>(
  row: T,
  key: keyof T,
  showIndexed: boolean,
  index: number,
): Record<string, unknown> {
  return Object.fromEntries(
    columnDefAbiParamsArgsChildren<T>(key, showIndexed, "Inputs", index).map(
      (columnDef) => {
        const valueGetter = (columnDef as ColDef).valueGetter as (
          params: ValueGetterParams<T>,
        ) => unknown;
        return [
          columnDef.headerName,
          valueGetter({ data: row } as ValueGetterParams<T>),
        ];
      },
    ),
  );
}

describe("columnDefAbiParamsArgsChildren", () => {
  test("a tuple has the standard JSON of its components", () => {
    expect(values(functionRow, "functionInputs", false, 0)).toEqual({
      Name: "s",
      Type: "tuple(uint256,address)",
      Components: JSON.stringify([
        { type: "uint256", name: "a" },
        { type: "address", name: "b" },
      ]),
    });
  });

  test("an array of tuples has the components of its tuple", () => {
    expect(values(functionRow, "functionInputs", false, 1)).toEqual({
      Name: "t",
      Type: "tuple(uint8,bool)[]",
      Components: JSON.stringify([
        { type: "uint8", name: "c" },
        { type: "bool", name: "" },
      ]),
    });
  });

  test("an array of a type that is not a tuple has no components", () => {
    expect(values(functionRow, "functionInputs", false, 2)).toEqual({
      Name: "u",
      Type: "uint256[]",
      Components: NO_DATA,
    });
  });

  test("an unnamed param has no name", () => {
    expect(values(functionRow, "functionInputs", false, 3)).toEqual({
      Name: NO_DATA,
      Type: "address",
      Components: NO_DATA,
    });
    expect(values(functionRow, "functionOutputs", false, 0)).toEqual({
      Name: NO_DATA,
      Type: "uint256",
      Components: NO_DATA,
    });
  });

  test("a function with fewer params has no data in the columns", () => {
    expect(values(functionRow, "functionInputs", false, 4)).toEqual({
      Name: NO_DATA,
      Type: NO_DATA,
      Components: NO_DATA,
    });
  });

  test("the inputs of an event have the indexed column", () => {
    expect(values(eventRow, "eventInputs", true, 0)).toEqual({
      Name: "from",
      Indexed: "true",
      Type: "address",
      Components: NO_DATA,
    });
    expect(values(eventRow, "eventInputs", true, 1)).toEqual({
      Name: "value",
      Indexed: "false",
      Type: "uint256",
      Components: NO_DATA,
    });
  });
});
