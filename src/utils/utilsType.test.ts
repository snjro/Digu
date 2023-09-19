import { describe, expect, test } from "vitest";

describe("KeysMatching", () => {
  test("should return a key of an object that match a specific type", () => {
    type TestObject = {
      a: string;
      b: number;
      c: boolean;
    };
    type ExpectedResult = KeysMatching<TestObject, string>;
    const expectedResult: ExpectedResult = "a";
    expect(expectedResult).toBe("a");
  });
});
