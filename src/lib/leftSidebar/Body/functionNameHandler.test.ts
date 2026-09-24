import { describe, expect, test } from "vitest";
import { getSplittedFunctionNameAndSelector } from "./functionNameHandler";

describe("getSplittedFunctionNameAndSelector", () => {
  test("should split the name and the selector", () => {
    expect(getSplittedFunctionNameAndSelector("transfer-0xa9059cbb")).toEqual({
      functionName: "transfer",
      functionSelector: "0xa9059cbb",
    });
  });
  test.each(["transfer", "transfer-0xa9059cbb-foo", ""])(
    "should return no selector for %j",
    (functionNameAndSelector) => {
      expect(
        getSplittedFunctionNameAndSelector(functionNameAndSelector),
      ).toEqual({
        functionName: functionNameAndSelector.split("-")[0],
        functionSelector: undefined,
      });
    },
  );
});
