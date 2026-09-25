import { describe, expect, test } from "vitest";
import { EventFragment, FunctionFragment } from "ethers";
import { getFirstTabUrlHash } from "$lib/PageWrapper/tabs";
import { getAbiFragmentHref } from "$lib/leftSidebar/Body/functionNameHandler";
import {
  getContractHref,
  getContractHrefFromBase,
  getSubdirectoryHref,
} from "./linkHref";

describe("getSubdirectoryHref", () => {
  test.each([
    ["/Digu/eth/Uniswap-v3/", "contracts", "/Digu/eth/Uniswap-v3/contracts"],
    [
      "/Digu/eth/Uniswap-v3/contracts/Pool/",
      "events",
      "/Digu/eth/Uniswap-v3/contracts/Pool/events",
    ],
    [
      "/Digu/eth/Uniswap-v3/contracts/Pool/",
      "functions",
      "/Digu/eth/Uniswap-v3/contracts/Pool/functions",
    ],
  ])(
    "should add %j and %j when trailingSlash is always",
    (pageUrlPathname, subdirectory, expected) => {
      expect(getSubdirectoryHref(pageUrlPathname, "always", subdirectory)).toBe(
        expected,
      );
    },
  );
  test.each<"never" | "ignore">(["never", "ignore"])(
    "should add a slash before the subdirectory when trailingSlash is %s",
    (trailingSlashOption) => {
      expect(
        getSubdirectoryHref(
          "/Digu/eth/Uniswap-v3",
          trailingSlashOption,
          "contracts",
        ),
      ).toBe("/Digu/eth/Uniswap-v3/contracts");
      expect(
        getSubdirectoryHref(
          "/Digu/eth/Uniswap-v3/contracts/Pool",
          trailingSlashOption,
          "events",
        ),
      ).toBe("/Digu/eth/Uniswap-v3/contracts/Pool/events");
    },
  );
});

describe("getContractHref", () => {
  test("should add the contract name to the contracts href", () => {
    expect(getContractHref("/Digu/eth/Uniswap-v3/contracts", "Pool")).toBe(
      "/Digu/eth/Uniswap-v3/contracts/Pool",
    );
  });
});

describe("getContractHrefFromBase", () => {
  test.each([
    ["", "/eth/Uniswap-v3/contracts/Pool"],
    ["/Digu", "/Digu/eth/Uniswap-v3/contracts/Pool"],
  ])("base %j gives %j", (basePath, expected) => {
    expect(
      getContractHrefFromBase(basePath, "eth", "Uniswap", "v3", "Pool"),
    ).toBe(expected);
  });
});

describe("links of the events and functions of a contract page", () => {
  const eventFragment = EventFragment.from(
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  );
  const functionFragment = FunctionFragment.from(
    "function transfer(address to, uint256 amount)",
  );
  test.each([
    ["always", "/Digu/eth/Uniswap-v3/contracts/Pool/"],
    ["never", "/Digu/eth/Uniswap-v3/contracts/Pool"],
    ["ignore", "/Digu/eth/Uniswap-v3/contracts/Pool"],
  ] as const)(
    "should give the same links when trailingSlash is %s",
    (trailingSlashOption, pageUrlPathname) => {
      const eventsHref = getSubdirectoryHref(
        pageUrlPathname,
        trailingSlashOption,
        "events",
      );
      const functionsHref = getSubdirectoryHref(
        pageUrlPathname,
        trailingSlashOption,
        "functions",
      );
      expect(
        `${getAbiFragmentHref(eventsHref, eventFragment)}#${getFirstTabUrlHash("events")}`,
      ).toBe("/Digu/eth/Uniswap-v3/contracts/Pool/events/Transfer#overview");
      expect(
        `${getAbiFragmentHref(functionsHref, functionFragment)}#${getFirstTabUrlHash("functions")}`,
      ).toBe(
        "/Digu/eth/Uniswap-v3/contracts/Pool/functions/transfer-0xa9059cbb#overview",
      );
    },
  );
});
