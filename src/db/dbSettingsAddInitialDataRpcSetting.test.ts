import "fake-indexeddb/auto";
import { describe, expect, test, vi } from "vitest";
import * as DBS from "./dbSettings";
import { initialDataRpcSetting, type RpcSetting } from "./dbTypes";
import { DB_TABLE_NAMES } from "./constants";
import type { Transaction } from "dexie";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain } from "@constants/chains/types";
const tableName = DB_TABLE_NAMES.Settings.rpcSettings;

describe("addInitialDataRpcSettings", () => {
  test("should NOT add any records when record(s) are on the table", async () => {
    await DBS.dbSettings.transaction(
      "rw",
      tableName,
      async (tx: Transaction) => {
        // set spy
        const spyGetDbRecordRpcSettings = vi.spyOn(
          DBS,
          "getDbRecordRpcSettings",
        );
        const spyBulkAdd = vi.spyOn(tx.table(tableName), "bulkAdd");

        // call test target function
        await DBS.addInitialDataRpcSettings(tx);

        // check
        expect(spyGetDbRecordRpcSettings).toBeCalledTimes(TARGET_CHAINS.length);
        expect(spyBulkAdd).not.toBeCalled();

        // restore spy
        spyGetDbRecordRpcSettings.mockRestore();
        spyBulkAdd.mockRestore();
      },
    );
  });

  test("shoud add initial data when any records are NOT on the table", async () => {
    await DBS.dbSettings.transaction(
      "rw",
      tableName,
      async (tx: Transaction) => {
        // expected arg of BulkAdd
        const adds: RpcSetting[] = TARGET_CHAINS.map((targetChain: Chain) => {
          return initialDataRpcSetting(targetChain);
        });

        // set spy
        const spyGetDbRecordRpcSettings = vi
          .spyOn(DBS, "getDbRecordRpcSettings")
          .mockResolvedValue(undefined);
        const spyBulkAdd = vi
          .spyOn(tx.table(tableName), "bulkAdd")
          .mockImplementationOnce(vi.fn());

        // call test target function
        await DBS.addInitialDataRpcSettings(tx);

        // check
        expect(spyGetDbRecordRpcSettings).toBeCalledTimes(TARGET_CHAINS.length);
        for (const targetChain of TARGET_CHAINS) {
          expect(spyGetDbRecordRpcSettings).toBeCalledWith(targetChain.name);
        }
        expect(spyBulkAdd).toBeCalledWith(adds);

        // restore
        spyGetDbRecordRpcSettings.mockRestore();
        spyBulkAdd.mockRestore();
      },
    );
  });
});
