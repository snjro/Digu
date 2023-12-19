import {
  vi,
  type SpyInstance,
  describe,
  test,
  expect,
  beforeEach,
} from "vitest";
import { dbBlockTimes } from "./dbBlockTimes";
import type { Chain } from "@constants/chains/types";
import type { BlockTime } from "./dbTypes";
import {
  getDbItemBlockTime,
  getDbRecordBlockTime,
  setDbBlockTime,
} from "./dbBlockTimesDataHandlers";
const dummyBlockNumber: number = 1;
const dummyChainName: Chain["name"] = "dummyChainName";
const dummyBlockTime: BlockTime = {
  blockNumber: dummyBlockNumber,
  timestamp: 2,
  isoDatetime: "isoDummy",
};

const spyDbBlockTimeTransaction: SpyInstance = vi.spyOn(
  dbBlockTimes,
  "transaction",
);
beforeEach(() => {
  spyDbBlockTimeTransaction.mockClear();
});

describe("setDbBlockTime", () => {
  test("should set block time correctly", async () => {
    spyDbBlockTimeTransaction.mockImplementation(vi.fn());
    await setDbBlockTime(dummyChainName, [dummyBlockTime]);
    expect(spyDbBlockTimeTransaction).toBeCalledWith(
      "rw",
      dummyChainName,
      expect.any(Function),
    );
  });
});
describe("getDbRecordBlockTime", () => {
  test("should get record block time correctly", async () => {
    spyDbBlockTimeTransaction.mockImplementation(vi.fn());
    await getDbRecordBlockTime(dummyChainName, dummyBlockNumber);
    expect(spyDbBlockTimeTransaction).toHaveBeenCalledWith(
      "r",
      dummyChainName,
      expect.any(Function),
    );
  });
});
describe("getDbItemBlockTime", () => {
  for (const key of Object.keys(dummyBlockTime)) {
    const definedKey: keyof BlockTime = key as keyof BlockTime;
    test(`should return correct item "${definedKey}"`, async () => {
      spyDbBlockTimeTransaction.mockImplementationOnce(() => {
        return dummyBlockTime;
      });
      const result = await getDbItemBlockTime(
        dummyChainName,
        dummyBlockNumber,
        definedKey,
      );
      expect(result).toBe(dummyBlockTime[definedKey]);
    });
  }
  test("should return undefined when getDbRecordBlocktime returns undefined", async () => {
    spyDbBlockTimeTransaction.mockImplementationOnce(() => {
      return undefined;
    });
    const result = await getDbItemBlockTime(
      dummyChainName,
      dummyBlockNumber,
      "blockNumber",
    );
    expect(result).toBeUndefined();
  });
});
