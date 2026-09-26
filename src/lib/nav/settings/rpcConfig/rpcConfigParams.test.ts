import { describe, expect, test } from "vitest";
import type { Chain } from "@constants/chains/types";
import { getRpcConfigParams } from "./rpcConfigParams";

describe("getRpcConfigParams", () => {
  test("should list the three settings in order", () => {
    const chain = { blockIntervalMs: 12000 } as unknown as Chain;
    expect(getRpcConfigParams(chain)).toEqual([
      {
        name: "bulkUnit",
        label: "Bulk Unit",
        minValue: 1,
        maxValue: 10000,
        step: 1,
      },
      {
        name: "tryCount",
        label: "Retry Count",
        minValue: 1,
        maxValue: 10,
        step: 1,
      },
      {
        name: "blockIntervalMs",
        label: "Block Interval [ms]",
        minValue: 1,
        maxValue: 12000,
        step: 1,
      },
    ]);
  });

  test.each([1, 2000, 12000])(
    "should use the block interval %j of the chain as the max",
    (blockIntervalMs) => {
      const chain = { blockIntervalMs } as unknown as Chain;
      const params = getRpcConfigParams(chain);
      expect(params.find((p) => p.name === "blockIntervalMs")?.maxValue).toBe(
        blockIntervalMs,
      );
      expect(params.find((p) => p.name === "bulkUnit")?.maxValue).toBe(10000);
      expect(params.find((p) => p.name === "tryCount")?.maxValue).toBe(10);
    },
  );
});
