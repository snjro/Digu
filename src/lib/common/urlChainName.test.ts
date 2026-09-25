import { describe, expect, test } from "vitest";
import { getUrlChainNameToSave } from "./urlChainName";

describe("getUrlChainNameToSave", () => {
  test("should return the chain in the URL when it differs from the saved one", () => {
    expect(getUrlChainNameToSave("matic", "eth")).toBe("matic");
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
