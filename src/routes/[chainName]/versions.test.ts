import { describe, expect, test } from "vitest";
import type { Version } from "@constants/chains/types";
import {
  getVersionHref,
  hasVersionEvents,
  numberOfEventsInVersion,
} from "./versions";

const version = (numsOfEvents: number[]): Version =>
  ({
    contracts: numsOfEvents.map((numOfEvents: number) => ({
      events: { abiFragments: new Array(numOfEvents).fill({}) },
    })),
  }) as unknown as Version;

describe("getVersionHref", () => {
  test("should add the name to the pathname when trailingSlash is always", () => {
    expect(getVersionHref("/digu/ethereum/", "always", "Uniswap", "v3")).toBe(
      "/digu/ethereum/Uniswap-v3",
    );
  });
  test.each<"never" | "ignore">(["never", "ignore"])(
    "should add a slash before the name when trailingSlash is %s",
    (trailingSlashOption) => {
      expect(
        getVersionHref("/digu/ethereum", trailingSlashOption, "Uniswap", "v3"),
      ).toBe("/digu/ethereum/Uniswap-v3");
    },
  );
});

describe("numberOfEventsInVersion", () => {
  test("should return 0 when the version has no contracts", () => {
    expect(numberOfEventsInVersion(version([]))).toBe(0);
  });
  test("should return 0 when no contract has events", () => {
    expect(numberOfEventsInVersion(version([0, 0]))).toBe(0);
  });
  test("should add up the events of all contracts", () => {
    expect(numberOfEventsInVersion(version([2, 0, 3]))).toBe(5);
  });
});

describe("hasVersionEvents", () => {
  test("should return false when the version has no events", () => {
    expect(hasVersionEvents(version([0]))).toBe(false);
  });
  test("should return true when the version has one event", () => {
    expect(hasVersionEvents(version([0, 1]))).toBe(true);
  });
});
