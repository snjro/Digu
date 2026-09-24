import { afterEach, describe, expect, test, vi } from "vitest";
import { updateDbItemUserSettings } from "@db/dbSettings";
import { getChainRootUrl, saveSelectedChainName } from "./selectChain";

vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("saveSelectedChainName", () => {
  test("writes the chain name to the user settings", async () => {
    await saveSelectedChainName("matic");
    expect(updateDbItemUserSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemUserSettings).toHaveBeenCalledWith(
      "selectedChainName",
      "matic",
    );
  });
});

describe("getChainRootUrl", () => {
  test.each([
    ["", "eth", "/eth"],
    ["/Digu", "eth", "/Digu/eth"],
    ["/Digu", "matic", "/Digu/matic"],
  ])("base %j and chain %j give %j", (basePath, chainName, expected) => {
    expect(getChainRootUrl(basePath, chainName)).toBe(expected);
  });
});
