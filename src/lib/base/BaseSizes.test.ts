import { describe, expect, test } from "vitest";
import { changeSize, type BaseSize } from "./baseSizes";

type TestParam = {
  baseSize: BaseSize;
  notch: number;
  expectedSize: BaseSize;
  text: string;
};
const testParams: TestParam[] = [
  {
    baseSize: "4xl",
    notch: 2,
    expectedSize: "5xl",
    text: "should return the max size when changed size exceeds upper limit",
  },
  {
    baseSize: "sm",
    notch: -2,
    expectedSize: "xs",
    text: "should return the min size when changed size exceeds lower limit",
  },
  {
    baseSize: "md",
    notch: 1,
    expectedSize: "lg",
    text: "should return the change size when changed size is int the range",
  },
];
describe("changeSize", () => {
  test.each(testParams)("$text", ({ baseSize, notch, expectedSize }) => {
    expect(changeSize(baseSize, notch)).toBe(expectedSize);
  });
});
