import { describe, expect, test } from "vitest";
import type { RpcConfigParam } from "./rpcConfigParams";
import { isInRpcConfigRange } from "./rpcConfigValidation";

const rpcConfigParam: RpcConfigParam = {
  name: "tryCount",
  label: "Try Count",
  minValue: 1,
  maxValue: 10,
  step: 1,
};

describe("isInRpcConfigRange", () => {
  test.each([
    [0, false],
    [0.5, false],
    [1, true],
    [5, true],
    [10, true],
    [10.5, false],
    [11, false],
    [-1, false],
    [NaN, false],
  ])("should judge %j as %j", (value, expected) => {
    expect(isInRpcConfigRange(rpcConfigParam, value)).toBe(expected);
  });
});
