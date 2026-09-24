import { describe, expect, test } from "vitest";
import type { ConvertedEventLog } from "@db/dbTypes";
import { getEachArgsMaxLengths, getMaxParamsLength } from "./maxParamsLength";

type Row = { params: string[] };
const getParams = (row: Row): string[] => row.params;

describe("getMaxParamsLength", () => {
  test("should return 0 when there are no rows", () => {
    expect(getMaxParamsLength([], getParams)).toBe(0);
  });
  test("should return 0 when every row has no params", () => {
    expect(
      getMaxParamsLength([{ params: [] }, { params: [] }], getParams),
    ).toBe(0);
  });
  test("should return the length of the only row", () => {
    expect(getMaxParamsLength([{ params: ["a"] }], getParams)).toBe(1);
  });
  test("should return the longest length wherever the row is", () => {
    const rows: Row[] = [
      { params: ["a"] },
      { params: ["a", "b", "c"] },
      { params: ["a", "b"] },
    ];
    expect(getMaxParamsLength(rows, getParams)).toBe(3);
  });
  test("should read the params with the given getter", () => {
    const rows = [{ inputs: ["a"], outputs: ["a", "b"] }];
    expect(getMaxParamsLength(rows, (row) => row.inputs)).toBe(1);
    expect(getMaxParamsLength(rows, (row) => row.outputs)).toBe(2);
  });
});

const eventLog = (args: unknown[]): ConvertedEventLog =>
  ({ args }) as unknown as ConvertedEventLog;

describe("getEachArgsMaxLengths", () => {
  test("should return an empty array when the logs are not loaded", () => {
    expect(getEachArgsMaxLengths(undefined, 2)).toEqual([]);
  });
  test("should return an empty array when the event has no inputs", () => {
    expect(getEachArgsMaxLengths([eventLog([])], 0)).toEqual([]);
  });
  test("should return 0 for each input when there are no logs", () => {
    expect(getEachArgsMaxLengths([], 2)).toEqual([0, 0]);
  });
  test("should return 1 for an arg that is not an array", () => {
    expect(getEachArgsMaxLengths([eventLog(["0xabc", 5])], 2)).toEqual([1, 1]);
  });
  test("should return 1 for an empty array", () => {
    expect(getEachArgsMaxLengths([eventLog([[]])], 1)).toEqual([1]);
  });
  test("should return the length of an array arg", () => {
    expect(getEachArgsMaxLengths([eventLog([["a", "b", "c"]])], 1)).toEqual([
      3,
    ]);
  });
  test("should return the longer length when the later array is longer", () => {
    expect(
      getEachArgsMaxLengths(
        [eventLog([["a", "b"]]), eventLog([["a", "b", "c"]])],
        1,
      ),
    ).toEqual([3]);
  });
  test("should keep the longest length when a later array is shorter", () => {
    expect(
      getEachArgsMaxLengths(
        [eventLog([["a", "b", "c"]]), eventLog([["a"]])],
        1,
      ),
    ).toEqual([3]);
  });
  test("should keep the longest length when a later arg is not an array", () => {
    expect(
      getEachArgsMaxLengths([eventLog([["a", "b", "c"]]), eventLog(["x"])], 1),
    ).toEqual([3]);
  });
  test("should count each input separately", () => {
    expect(
      getEachArgsMaxLengths([eventLog([["a", "b"], "x", ["a"]])], 3),
    ).toEqual([2, 1, 1]);
  });
});
