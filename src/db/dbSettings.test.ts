import "fake-indexeddb/auto";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "@db/constants";
import { describe, expect, test, vi } from "vitest";
import { addInitialDataOfDbSettings, dbSettings } from "./dbSettings";

const tableNameRpcSettings = DB_TABLE_NAMES.Settings.rpcSettings;
const tableNameUserSettings = DB_TABLE_NAMES.Settings.userSettings;

describe("DbSettings", () => {
  test("should set up the database with the correct version number", () => {
    expect(dbSettings.verno).toBe(DB_VERSIONS.Settings);
  });
  test("should set up the database with the correct DB name", () => {
    expect(dbSettings.name).toBe(
      [DB_NAME.firstName, DB_NAME.secondNames.settings].join("_"),
    );
  });

  test("should set up the database with the correct schema definition", () => {
    let expectedDbSchema: any = {
      RpcSettings: {
        name: "RpcSettings",
        primKey: {
          name: "chainName",
          keyPath: "chainName",
          unique: false,
          multi: false,
          auto: false,
          compound: false,
          src: "chainName",
        },
        indexes: [],
        mappedClass: null,
        idxByName: {},
      },
      UserSettings: {
        name: "UserSettings",
        primKey: {
          name: "userSettingsId",
          keyPath: "userSettingsId",
          unique: false,
          multi: false,
          auto: false,
          compound: false,
          src: "userSettingsId",
        },
        indexes: [],
        mappedClass: null,
        idxByName: {},
      },
    };
    expect(dbSettings._dbSchema).toEqual(expectedDbSchema);
  });
});

describe("addInitialDataOfDbSettings", () => {
  test("should be called with correct arguments", async () => {
    // set spy
    const spyADbSettingsTransaction = vi.spyOn(dbSettings, "transaction");
    const spyAddinitialData = vi
      .spyOn(dbSettings, "addInitialData")
      .mockImplementation(() => {
        return Promise.resolve();
      });
    // call target
    await addInitialDataOfDbSettings();
    // check
    expect(spyADbSettingsTransaction).toBeCalledWith(
      "rw",
      dbSettings.table(tableNameRpcSettings),
      dbSettings.table(tableNameUserSettings),
      expect.any(Function),
    );
    expect(spyAddinitialData).toBeCalled();
    // restore
    spyADbSettingsTransaction.mockRestore();
    spyAddinitialData.mockRestore();
  });
});
