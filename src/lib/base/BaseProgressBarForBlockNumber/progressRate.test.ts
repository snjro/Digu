import { describe, expect, test } from "vitest";
import { getProgressRate } from "./progressRate";

describe("getProgressRate", () => {
  test("returns the rate of current between start and end", () => {
    expect(getProgressRate(100, 200, 150)).toBe(50);
    expect(getProgressRate(0, 3, 1)).toBe(33.333);
  });

  test("returns 0 at start and 100 at end", () => {
    expect(getProgressRate(100, 200, 100)).toBe(0);
    expect(getProgressRate(100, 200, 200)).toBe(100);
  });

  test("stops at 100 when current is past end", () => {
    expect(getProgressRate(100, 200, 300)).toBe(100);
  });

  test("returns 100 when end is start and current is past it", () => {
    expect(getProgressRate(100, 100, 150)).toBe(100);
  });

  test("returns 0 when current is before start", () => {
    expect(getProgressRate(100, 200, 50)).toBe(0);
  });

  test("returns 0 when start, end and current are the same", () => {
    expect(getProgressRate(100, 100, 100)).toBe(0);
  });
});
