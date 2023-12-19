import "fake-indexeddb/auto";
import { describe, expect, test, vi } from "vitest";
import { DB_TABLE_NAMES } from "./constants";
import type { Transaction } from "dexie";
import { initialDataUserSettings, type UserSetting } from "./dbTypes";
import * as DBS from "./dbSettings";
const tableName = DB_TABLE_NAMES.Settings.userSettings;

describe("addInitialDataUserSettings", () => {
  test("should NOT add any records when record(s) are on the table", async () => {
    await DBS.dbSettings.transaction(
      "rw",
      tableName,
      async (tx: Transaction) => {
        // set spy
        const spyGetDbRecordUserSettings = vi.spyOn(
          DBS,
          "getDbRecordUserSettings",
        );
        const spyBulkAdd = vi.spyOn(tx.table(tableName), "bulkAdd");

        // call test target
        await DBS.addInitialDataUserSettings(tx);

        // check
        expect(spyGetDbRecordUserSettings).toBeCalledTimes(1);
        expect(spyGetDbRecordUserSettings).toBeCalledWith("userSetting01");
        expect(spyBulkAdd).not.toBeCalled();

        // restore
        spyGetDbRecordUserSettings.mockRestore();
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
        const adds: UserSetting[] = [initialDataUserSettings];

        // set spy
        const spyGetDbRecordUserSettings = vi
          .spyOn(DBS, "getDbRecordUserSettings")
          .mockResolvedValue(undefined);
        const spyBulkAdd = vi
          .spyOn(tx.table(tableName), "bulkAdd")
          .mockImplementationOnce(vi.fn());

        // call test target function
        await DBS.addInitialDataUserSettings(tx);

        // check
        expect(spyGetDbRecordUserSettings).toBeCalledTimes(1);
        expect(spyGetDbRecordUserSettings).toBeCalledWith("userSetting01");
        expect(spyBulkAdd).toBeCalledWith(adds);

        // restore
        spyGetDbRecordUserSettings.mockRestore();
        spyBulkAdd.mockRestore();
      },
    );
  });
});
