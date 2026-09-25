import { describe, expect, test } from "vitest";
import { getProjectVersionNameForLabelFromUrl } from "./projectVersionNameHelper";

describe("getProjectVersionNameForLabelFromUrl", () => {
  test("should turn the name in the URL into the label", () => {
    expect(getProjectVersionNameForLabelFromUrl("UniswapV3-v1")).toBe(
      "UniswapV3 v1",
    );
  });
  test("should use only the first two parts when there are more hyphens", () => {
    expect(getProjectVersionNameForLabelFromUrl("a-b-c")).toBe("a b");
  });
  test("should show undefined as the version when there is no hyphen", () => {
    expect(getProjectVersionNameForLabelFromUrl("a")).toBe("a undefined");
  });
});
