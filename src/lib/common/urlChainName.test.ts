import { describe, expect, test, vi } from "vitest";
import { getUrlChainNameToSave } from "./urlChainName";

vi.mock("#constants/chains/_index.js", async (importOriginal) =>
  (await import("../../testUtils/secondChain")).withSecondChain(importOriginal),
);

describe("getUrlChainNameToSave", () => {
  test("should return the chain in the URL when it differs from the saved one", () => {
    expect(getUrlChainNameToSave("chain2", "eth")).toBe("chain2");
  });
  test("should return undefined when the chain in the URL is the saved one", () => {
    expect(getUrlChainNameToSave("eth", "eth")).toBeUndefined();
  });
  test("should return undefined when the URL has no chain", () => {
    expect(getUrlChainNameToSave(undefined, "eth")).toBeUndefined();
  });
  test("should return undefined when the chain in the URL is unknown", () => {
    expect(getUrlChainNameToSave("foo", "eth")).toBeUndefined();
  });
});
