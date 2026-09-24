import { describe, expect, test } from "vitest";
import type { SyncStatusContract } from "@db/dbTypes";
import {
  getBlockNumberByHeaderName,
  type HeaderName,
} from "./syncStatusBlockNumber";

const syncStatus = {
  creationBlockNumber: 100,
  fetchedBlockNumber: 250,
} as unknown as SyncStatusContract;

describe("getBlockNumberByHeaderName", () => {
  test.each<[HeaderName, number]>([
    ["Start", 100],
    ["Current", 250],
    ["Goal", 1000],
  ])("should return the block number for %s", (headerName, expected) => {
    expect(getBlockNumberByHeaderName(headerName, 1000, syncStatus)).toBe(
      expected,
    );
  });
  test.each<HeaderName>(["Start", "Current", "Goal"])(
    "should return 0 for %s when the contract has no sync status",
    (headerName) => {
      expect(
        getBlockNumberByHeaderName(
          headerName,
          1000,
          undefined as unknown as SyncStatusContract,
        ),
      ).toBe(0);
    },
  );
  test("should return the block numbers as they are when they are 0", () => {
    const zeroSyncStatus = {
      creationBlockNumber: 0,
      fetchedBlockNumber: 0,
    } as unknown as SyncStatusContract;
    expect(getBlockNumberByHeaderName("Start", 0, zeroSyncStatus)).toBe(0);
    expect(getBlockNumberByHeaderName("Current", 0, zeroSyncStatus)).toBe(0);
    expect(getBlockNumberByHeaderName("Goal", 0, zeroSyncStatus)).toBe(0);
  });
});
