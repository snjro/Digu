import { describe, expect, test } from "vitest";
import type { SyncStatusVersion } from "#db/dbTypes.js";
import { getProgressRate } from "./progressRate";
import { getSummedProgressRange } from "./syncStatusProgress";

function syncStatus(
  creationBlockNumber: number,
  fetchedBlockNumber: number,
  numOfSyncTargetContract: number,
): SyncStatusVersion {
  return {
    creationBlockNumber,
    fetchedBlockNumber,
    numOfSyncTargetContract,
  } as unknown as SyncStatusVersion;
}

describe("getSummedProgressRange", () => {
  test("multiplies the latest block by 2 for 2 sync target contracts", () => {
    expect(getSummedProgressRange(syncStatus(10, 150, 2), 100)).toEqual({
      start: 10,
      goal: 200,
      current: 150,
    });
  });

  test("uses the latest block as the goal for 1 sync target contract", () => {
    expect(getSummedProgressRange(syncStatus(10, 50, 1), 100)).toEqual({
      start: 10,
      goal: 100,
      current: 50,
    });
  });

  test("returns a goal of 0 for no sync target contract", () => {
    const range = getSummedProgressRange(syncStatus(0, 0, 0), 100);
    expect(range).toEqual({ start: 0, goal: 0, current: 0 });
    expect(getProgressRate(range.start, range.goal, range.current)).toBe(0);
  });
});
