import {
  vi,
  type SpyInstance,
  describe,
  test,
  expect,
  beforeEach,
} from "vitest";
import type { Chain } from "@constants/chains/types";
import type { ChainStatus } from "./dbTypes";
import {
  getDbRecordChainStatus,
  updateDbItemChainStatus,
} from "./dbChainStatusDataHandlers";
import { dbChainStatus } from "./dbChainStatus";
import { DB_TABLE_NAMES } from "./constants";
import { storeChainStatus } from "@stores/storeChainStatus";
import Dexie from "dexie";
const dummyChainName: Chain["name"] = "dummyChainName";
const tableNameChainStatus = DB_TABLE_NAMES.ChainStatus;

const dummyChainStatus: ChainStatus = {
  chainName: dummyChainName,
  latestBlockNumber: 1,
  nodeStatus: "CONNECTING",
};

const spyDbChainStatusTransaction: SpyInstance = vi.spyOn(
  dbChainStatus,
  "transaction",
);
const spyStoreChainStatus = vi
  .spyOn(storeChainStatus, "updateState")
  .mockImplementation(() => {
    return vi.fn();
  });

beforeEach(() => {
  spyDbChainStatusTransaction.mockClear();
  spyStoreChainStatus.mockClear();
});

describe("updateDbItemChainStatus", () => {
  for (const key of Object.keys(dummyChainStatus)) {
    const definedKey: keyof ChainStatus = key as keyof ChainStatus;
    test(`should set selected item "${definedKey}"`, async () => {
      spyDbChainStatusTransaction.mockImplementation(() => {
        return Dexie.Promise.resolve().then(() => {});
      });
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
      expect(spyStoreChainStatus).toBeCalledWith(dummyChainName, {
        [definedKey]: dummyChainStatus[definedKey],
      });
    });
  }
});
describe("getDbRecordChainStatus", () => {
  test("should get record correctly", async () => {
    spyDbChainStatusTransaction.mockImplementation(() => {
      return Dexie.Promise.resolve().then(() => {});
    });
    await getDbRecordChainStatus(dummyChainName);
    expect(spyDbChainStatusTransaction).toHaveBeenCalledWith(
      "r",
      tableNameChainStatus,
      expect.any(Function),
    );
  });
});
