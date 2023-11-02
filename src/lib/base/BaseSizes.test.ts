import { describe, expect, test } from "vitest";
import { changeSize, type BaseSize } from "./baseSizes";

describe("changeSize", () => {
  test("should return the max size when changed size exceeds upper limit", () => {
    const baseSize: BaseSize = "4xl";
    const notch: number = 2;
    const expectedSize: BaseSize = "5xl";
    expect(changeSize(baseSize, notch)).toBe(expectedSize);
  });
  test("should return the min size when changed size exceeds lower limit", () => {
    const baseSize: BaseSize = "sm";
    const notch: number = -2;
    const expectedSize: BaseSize = "xs";
    expect(changeSize(baseSize, notch)).toBe(expectedSize);
  });
  test("should return the change size when changed size is int the range", () => {
    const baseSize: BaseSize = "md";
    const notch: number = 1;
    const expectedSize: BaseSize = "lg";
    expect(changeSize(baseSize, notch)).toBe(expectedSize);
  });
});
