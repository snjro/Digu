import { describe, expect, test } from "vitest";
import { getChainRootUrl } from "./chainRootUrl";

describe("getChainRootUrl", () => {
  test.each([
    ["", "eth", "/eth"],
    ["/Digu", "eth", "/Digu/eth"],
    ["/Digu", "matic", "/Digu/matic"],
  ])("base %j and chain %j give %j", (basePath, chainName, expected) => {
    expect(getChainRootUrl(basePath, chainName)).toBe(expected);
  });
});
