import {
  vi,
  type MockInstance,
  describe,
  test,
  expect,
  beforeEach,
} from "vitest";
import type { Chain } from "#constants/chains/types.js";
import type { ChainStatus } from "./dbTypes";
import {
  getDbRecordChainStatus,
  raiseDbLatestBlockNumber,
  updateDbItemChainStatus,
} from "./dbChainStatusDataHandlers";
import { dbChainStatus } from "./dbChainStatus";
import { DB_TABLE_NAMES } from "./constants";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import Dexie from "dexie";
const dummyChainName: Chain["name"] = "dummyChainName";
const tableNameChainStatus = DB_TABLE_NAMES.ChainStatus;

const dummyChainStatus: ChainStatus = {
  chainName: dummyChainName,
  latestBlockNumber: 1,
  nodeStatus: "CONNECTING",
};

const spyDbChainStatusTransaction: MockInstance = vi.spyOn(
  dbChainStatus,
  "transaction",
);
const spyTableUpdate: MockInstance = vi
  .spyOn(dbChainStatus.table(tableNameChainStatus), "update")
  .mockResolvedValue(1);
const spyTableGet: MockInstance = vi
  .spyOn(dbChainStatus.table(tableNameChainStatus), "get")
  .mockResolvedValue(dummyChainStatus);
const spyStoreChainStatus = vi
  .spyOn(storeChainStatus, "updateState")
  .mockImplementation(() => {
    return vi.fn();
  });

beforeEach(() => {
  // run the callback passed to transaction without opening the DB
  spyDbChainStatusTransaction
    .mockClear()
    .mockImplementation(
      (_mode: string, _tableName: string, callback: () => Promise<unknown>) => {
        return Dexie.Promise.resolve(callback());
      },
    );
  spyTableUpdate.mockClear();
  spyTableGet.mockClear();
  spyStoreChainStatus.mockClear();
});

describe("updateDbItemChainStatus", () => {
  for (const key of Object.keys(dummyChainStatus)) {
    const definedKey: keyof ChainStatus = key as keyof ChainStatus;
    test(`should set selected item "${definedKey}"`, async () => {
      await updateDbItemChainStatus(
        dummyChainName,
        definedKey,
        dummyChainStatus[definedKey],
      );
      expect(spyDbChainStatusTransaction).toBeCalledWith(
        "rw",
        tableNameChainStatus,
        expect.any(Function),
      );
      expect(spyTableUpdate).toBeCalledTimes(1);
      expect(spyTableUpdate).toBeCalledWith(dummyChainName, {
        [definedKey]: dummyChainStatus[definedKey],
      });
      expect(spyStoreChainStatus).toBeCalledTimes(1);
      expect(spyStoreChainStatus).toBeCalledWith(dummyChainName, {
        [definedKey]: dummyChainStatus[definedKey],
      });
    });
  }
});
describe("getDbRecordChainStatus", () => {
  test("should get record correctly", async () => {
    const result: ChainStatus = await getDbRecordChainStatus(dummyChainName);
    expect(spyDbChainStatusTransaction).toHaveBeenCalledWith(
      "r",
      tableNameChainStatus,
      expect.any(Function),
    );
    expect(spyTableGet).toBeCalledWith(dummyChainName);
    expect(result).toEqual(dummyChainStatus);
  });
});

describe("raiseDbLatestBlockNumber", () => {
  test("should write a higher latest block to the DB and the store", async () => {
    await raiseDbLatestBlockNumber(dummyChainName, 2);

    expect(spyTableUpdate).toHaveBeenCalledExactlyOnceWith(dummyChainName, {
      latestBlockNumber: 2,
    });
    expect(spyStoreChainStatus).toHaveBeenCalledExactlyOnceWith(
      dummyChainName,
      { latestBlockNumber: 2 },
    );
  });

  test.each([1, 0])(
    "should not write %s to the DB, and give the store the one of the DB",
    async (latestBlockNumber: number) => {
      await raiseDbLatestBlockNumber(dummyChainName, latestBlockNumber);

      expect(spyTableUpdate).not.toHaveBeenCalled();
      // A store behind the DB catches up.
      expect(spyStoreChainStatus).toHaveBeenCalledExactlyOnceWith(
        dummyChainName,
        { latestBlockNumber: dummyChainStatus.latestBlockNumber },
      );
    },
  );

  test("should leave the store as it is when it has the value", async () => {
    const spyGetStore = vi
      .spyOn(storeChainStatus, "subscribe")
      .mockImplementation((run) => {
        run({
          [dummyChainName]: { latestBlockNumber: 1 },
        } as unknown as Parameters<typeof run>[0]);
        return () => {};
      });
    try {
      await raiseDbLatestBlockNumber(dummyChainName, 1);

      expect(spyStoreChainStatus).not.toHaveBeenCalled();
    } finally {
      spyGetStore.mockRestore();
    }
  });

  test("should change nothing for a chain without a row", async () => {
    spyTableGet.mockResolvedValueOnce(undefined);

    await raiseDbLatestBlockNumber(dummyChainName, 2);

    expect(spyTableUpdate).not.toHaveBeenCalled();
    expect(spyStoreChainStatus).not.toHaveBeenCalled();
  });

  test("should read and write in one transaction", async () => {
    await raiseDbLatestBlockNumber(dummyChainName, 2);

    expect(spyDbChainStatusTransaction).toHaveBeenCalledOnce();
    expect(spyDbChainStatusTransaction.mock.calls[0][0]).toBe("rw");
  });
});
