import {
  vi,
  type MockInstance,
  describe,
  test,
  expect,
  beforeEach,
} from "vitest";
import { dbBlockTimes } from "./dbBlockTimes";
import Dexie from "dexie";
import type { Chain } from "#constants/chains/types.js";
import type { BlockTime } from "./dbTypes";
import { setDbBlockTime } from "./dbBlockTimesDataHandlers";
const dummyBlockNumber: number = 1;
// a chain that has a table in dbBlockTimes
const dummyChainName: Chain["name"] = "eth";
const dummyBlockTime: BlockTime = {
  blockNumber: dummyBlockNumber,
  timestamp: 2,
  isoDatetime: "isoDummy",
};

const spyDbBlockTimeTransaction: MockInstance = vi.spyOn(
  dbBlockTimes,
  "transaction",
);
const spyTableBulkPut: MockInstance = vi
  .spyOn(dbBlockTimes.table(dummyChainName), "bulkPut")
  .mockResolvedValue(dummyBlockNumber);
// run the callback passed to transaction without opening the DB
const runCallback = (
  _mode: string,
  _tableName: string,
  callback: () => Promise<unknown>,
) => {
  return Dexie.Promise.resolve(callback());
};
beforeEach(() => {
  spyDbBlockTimeTransaction.mockClear();
  spyTableBulkPut.mockClear();
});

describe("setDbBlockTime", () => {
  test("should set block time correctly", async () => {
    spyDbBlockTimeTransaction.mockImplementation(runCallback);
    await setDbBlockTime(dummyChainName, [dummyBlockTime]);
    expect(spyDbBlockTimeTransaction).toBeCalledWith(
      "rw",
      dummyChainName,
      expect.any(Function),
    );
    expect(spyTableBulkPut).toBeCalledTimes(1);
    expect(spyTableBulkPut).toBeCalledWith([dummyBlockTime]);
  });
});
