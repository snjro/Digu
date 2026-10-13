import { describe, expect, test } from "vitest";
import { getPageChainName } from "./pageChainName";

describe("getPageChainName", () => {
  test("should return the chain in the URL", () => {
    expect(getPageChainName("chain2", "eth")).toBe("chain2");
  });
  test("should return the selected chain when the URL has no chain", () => {
    expect(getPageChainName(undefined, "eth")).toBe("eth");
  });
});
