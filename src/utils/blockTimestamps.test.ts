import { describe, expect, test } from "vitest";
import { BlockTimestamps } from "./blockTimestamps";

describe("BlockTimestamps", () => {
  test("should keep the blocks of the current and the previous maps", () => {
    const blockTimestamps = new BlockTimestamps(3);
    for (const blockNumber of [1, 2, 3]) {
      blockTimestamps.set(blockNumber, blockNumber * 10);
    }
    expect(blockTimestamps.get(1)).toBe(10);
    expect(blockTimestamps.get(3)).toBe(30);

    // The third block filled the current map, which became the previous one.
    blockTimestamps.set(4, 40);
    blockTimestamps.set(5, 50);
    expect([1, 2, 3, 4, 5].map((n) => blockTimestamps.get(n))).toEqual([
      10, 20, 30, 40, 50,
    ]);
  });

  test("should drop the previous map when the current one is full again", () => {
    const blockTimestamps = new BlockTimestamps(3);
    for (let blockNumber = 1; blockNumber <= 8; blockNumber++) {
      blockTimestamps.set(blockNumber, blockNumber * 10);
    }
    expect([1, 2, 3].map((n) => blockTimestamps.get(n))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect([4, 5, 6, 7, 8].map((n) => blockTimestamps.get(n))).toEqual([
      40, 50, 60, 70, 80,
    ]);
  });

  test("should read a block set again from the current map", () => {
    const blockTimestamps = new BlockTimestamps(3);
    for (const blockNumber of [1, 2, 3, 4]) {
      blockTimestamps.set(blockNumber, blockNumber * 10);
    }
    blockTimestamps.set(1, 11);
    expect(blockTimestamps.get(1)).toBe(11);
  });
});
