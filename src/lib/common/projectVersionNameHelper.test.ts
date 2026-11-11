import { describe, expect, test } from "vitest";
import { getProjectVersionNameForLabelFromUrl } from "./projectVersionNameHelper";

describe("getProjectVersionNameForLabelFromUrl", () => {
  test("should turn the name in the URL into the label", () => {
    expect(getProjectVersionNameForLabelFromUrl("UniswapV3-v1")).toBe(
      "UniswapV3 v1",
    );
  });
  test("should keep the hyphens after the first one in the version", () => {
    expect(getProjectVersionNameForLabelFromUrl("a-b-c")).toBe("a b-c");
  });
  test("should show an empty version when there is no hyphen", () => {
    expect(getProjectVersionNameForLabelFromUrl("a")).toBe("a ");
  });
});
