import { describe, expect, test } from "vitest";
import { EventFragment, FunctionFragment } from "ethers";
import {
  getAbiFragmentHref,
  getSplittedFunctionNameAndSelector,
} from "./functionNameHandler";

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

describe("getAbiFragmentHref", () => {
  test("should add the event name", () => {
    expect(
      getAbiFragmentHref(
        "/Digu/eth/Uniswap-v3/contracts/Pool/events",
        EventFragment.from(
          "event Transfer(address indexed from, address indexed to, uint256 value)",
        ),
      ),
    ).toBe("/Digu/eth/Uniswap-v3/contracts/Pool/events/Transfer");
  });
  test("should add the function name and the selector", () => {
    expect(
      getAbiFragmentHref(
        "/Digu/eth/Uniswap-v3/contracts/Pool/functions",
        FunctionFragment.from("function transfer(address to, uint256 amount)"),
      ),
    ).toBe("/Digu/eth/Uniswap-v3/contracts/Pool/functions/transfer-0xa9059cbb");
  });
});
