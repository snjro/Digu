import { describe, expect, test } from "vitest";
import {
  TAB_VALUES_CONTRACT,
  TAB_VALUES_EVENT,
  TAB_VALUES_FUNCTION,
  convertTabValueForHref,
  getFirstTabUrlHash,
} from "./tabs";

describe("TAB_VALUES", () => {
  test("should list the tabs of each page", () => {
    expect(TAB_VALUES_CONTRACT).toEqual(["Overview", "ABI"]);
    expect(TAB_VALUES_FUNCTION).toEqual(["Overview", "ABI"]);
    expect(TAB_VALUES_EVENT).toEqual([
      "Overview",
      "ABI",
      "Event Logs (text)",
      "Event Logs (hex)",
    ]);
  });
});

describe("convertTabValueForHref", () => {
  test.each([
    ["Overview", "#overview"],
    ["ABI", "#abi"],
    ["Event Logs (text)", "#event-logs-text"],
    ["Event Logs (hex)", "#event-logs-hex"],
  ] as const)("should convert %j to %j", (tabValue, href) => {
    expect(convertTabValueForHref(tabValue)).toBe(href);
  });
});

describe("getFirstTabUrlHash", () => {
  test.each(["contracts", "events", "functions"] as const)(
    "should return the hash of the first tab of %s",
    (pageType) => {
      expect(getFirstTabUrlHash(pageType)).toBe("overview");
    },
  );
});
