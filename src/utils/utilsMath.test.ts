import { describe, expect, test } from "vitest";
import { round } from "./utilsMath";

describe('"round"', () => {
  test("should correctly round a number to the specified decimal place", () => {
    const num: number = 1.2345;
    const place: number = 2;
    const expected: number = 1.23;

    expect(round(num, place)).toBe(expected);
  });

  test("should return the original number when the decimal place is 0", () => {
    const num: number = 1.2345;
    const place: number = 0;
    const expected: number = 1;

    expect(round(num, place)).toBe(expected);
  });

  test("should correctly round a negative number to the specified decimal place", () => {
    const num: number = -1.2345;
    const place: number = 2;
    const expected: number = -1.23;

    expect(round(num, place)).toBe(expected);
  });

  test("should return NaN when the input is not a number", () => {
    const num: any = "abc";
    const place: number = 2;

    expect(round(num, place)).toBeNaN();
  });
});
