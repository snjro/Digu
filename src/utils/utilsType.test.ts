import { describe, expect, test } from "vitest";
type TestType = {
  a: number;
  b: string;
  c: boolean;
};

describe("KeysMatching", () => {
  test("should return keys of matching types", () => {
    type ExpectedResult = KeysMatching<TestType, number>;
    const expectedResult: ExpectedResult = "a";
    expect(expectedResult).toBe("a");
  });
  test("should not include keys of non-matching types", () => {
    type ExpectedResult = KeysMatching<TestType, number>;
    const keys: ExpectedResult[] = ["a"];
    expect(keys).not.toContain("b");
    expect(keys).not.toContain("c");
  });
});
