import { describe, expect, test } from "vitest";
import { getCrumbItems, type CrumbItem } from "./crumbs";

const BASE = "/Digu";
const VERSION = `${BASE}/eth/Augur-version1`;
const home: CrumbItem = {
  href: `${BASE}/eth`,
  text: undefined,
  prefixIconName: "home",
};
function crumb(href: string, text: string): CrumbItem {
  return { href: href, text: text, prefixIconName: undefined };
}

describe("getCrumbItems", () => {
  test("the chain page gives only the home crumb", () => {
    expect(getCrumbItems(`${BASE}/eth/`, "eth", BASE, "always")).toEqual([
      home,
    ]);
  });
  test("the home crumb uses the chain name and the base path", () => {
    expect(getCrumbItems("/matic/", "matic", "", "always")).toEqual([
      { href: "/matic", text: undefined, prefixIconName: "home" },
    ]);
  });
  test("an event page adds the overview hash to the contract and the event", () => {
    expect(
      getCrumbItems(
        `${VERSION}/contracts/Cash/events/Transfer/`,
        "eth",
        BASE,
        "always",
      ),
    ).toEqual([
      home,
      crumb(VERSION, "Augur version1"),
      crumb(`${VERSION}/contracts`, "contracts"),
      crumb(`${VERSION}/contracts/Cash#overview`, "Cash"),
      crumb(`${VERSION}/contracts/Cash/events`, "events"),
      crumb(`${VERSION}/contracts/Cash/events/Transfer#overview`, "Transfer"),
    ]);
  });
  test("a function page removes the selector from the text only", () => {
    expect(
      getCrumbItems(
        `${VERSION}/contracts/Cash/functions/transfer-0xa9059cbb/`,
        "eth",
        BASE,
        "always",
      ),
    ).toEqual([
      home,
      crumb(VERSION, "Augur version1"),
      crumb(`${VERSION}/contracts`, "contracts"),
      crumb(`${VERSION}/contracts/Cash#overview`, "Cash"),
      crumb(`${VERSION}/contracts/Cash/functions`, "functions"),
      crumb(
        `${VERSION}/contracts/Cash/functions/transfer-0xa9059cbb#overview`,
        "transfer",
      ),
    ]);
  });
  test("a function name without a selector stays as it is", () => {
    expect(
      getCrumbItems(
        `${VERSION}/contracts/Cash/functions/transfer/`,
        "eth",
        BASE,
        "always",
      ).at(-1),
    ).toEqual(
      crumb(
        `${VERSION}/contracts/Cash/functions/transfer#overview`,
        "transfer",
      ),
    );
  });
  test.each(["never", "ignore"] as const)(
    "with trailingSlash %j the last character is kept",
    (trailingSlash) => {
      expect(
        getCrumbItems(`${VERSION}/contracts`, "eth", BASE, trailingSlash),
      ).toEqual([
        home,
        crumb(VERSION, "Augur version1"),
        crumb(`${VERSION}/contracts`, "contracts"),
      ]);
    },
  );
  test("an empty path segment adds no crumb", () => {
    expect(getCrumbItems(`${BASE}/eth/`, "eth", BASE, "never")).toEqual([home]);
  });
});
