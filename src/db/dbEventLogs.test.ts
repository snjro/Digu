import "fake-indexeddb/auto";
import {
  addInitialDataOfDbEventLogs,
  DbEventLogs,
  getDbEventLogs,
} from "./dbEventLogs";
import {
  DB_NAME,
  DB_TABLE_NAMES,
  DB_VERSIONS,
  PK_AUTO_INCREMENTED,
} from "@db/constants";
import { describe, expect, test, vi } from "vitest";
import type {
  SchemaDefinition,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { getEventTableNames } from "@utils/utilsDb";
import { extractEventContracts } from "@utils/utilsEthers";
import { getInitialDataOfSyncStatusContract } from "./dbEventLogsAddInitialData";
import Dexie from "dexie";
import type { Contract } from "@constants/chains/types";

describe("DbEventLogs", () => {
  for (const targetChain of TARGET_CHAINS) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        // call target
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);

        test("should set up the database with the correct version number", () => {
          expect(dbEventLogs.verno).toBe(DB_VERSIONS.EventLog);
        });
        test("should set up the database with the correct DB name", () => {
          expect(dbEventLogs.name).toBe(
            [
              DB_NAME.firstName,
              DB_NAME.secondNames.eventLog,
              ...Object.values(versionIdentifier),
            ].join("_"),
          );
        });

        test("should add the initial sync statuses when the database is created", async () => {
          const expectedSyncStatuses = extractEventContracts(
            targetVersion.contracts,
          ).map(getInitialDataOfSyncStatusContract);

          await dbEventLogs.open();
          const actualSyncStatuses = await dbEventLogs
            .table(DB_TABLE_NAMES.EventLog.syncStatus)
            .toArray();
          dbEventLogs.close();

          expect(actualSyncStatuses).toEqual(expectedSyncStatuses);
        });

        test("should set versionIdentifier correctly", () => {
          expect(dbEventLogs.versionIdentifier).toEqual(versionIdentifier);
        });
        test("should set up the database with the correct schema definition", () => {
          const expectedDbSchema: Record<string, unknown> = {};
          const eventTableNames: string[] = getEventTableNames(
            targetVersion.contracts,
          );

          for (const eventTableName of eventTableNames) {
            expectedDbSchema[eventTableName] = {
              name: eventTableName,
              indexes: [],
              mappedClass: null,
              idxByName: {},
              primKey: {
                name: "id",
                keyPath: "id",
                unique: true,
                multi: false,
                auto: true,
                compound: false,
                src: "++id",
              },
            };
          }
          expectedDbSchema[DB_TABLE_NAMES.EventLog.syncStatus] = {
            name: DB_TABLE_NAMES.EventLog.syncStatus,
            primKey: {
              name: "name",
              keyPath: "name",
              unique: true,
              multi: false,
              auto: false,
              compound: false,
              src: "name",
            },
            indexes: [],
            mappedClass: null,
            idxByName: {},
          };

          expect(dbEventLogs._dbSchema).toEqual(expectedDbSchema);
        });
      }
    }
  }
});

describe("addInitialDataOfDbEventLogs", () => {
  // a version that has two or more contracts with events
  let versionIdentifier: VersionIdentifier | undefined;
  let targetContracts: Contract[] = [];
  for (const targetChain of TARGET_CHAINS) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const eventContracts = extractEventContracts(targetVersion.contracts);
        if (!versionIdentifier && eventContracts.length >= 2) {
          versionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };
          targetContracts = eventContracts;
        }
      }
    }
  }

  test("should add the sync statuses of the contracts added after the database was created", async () => {
    if (!versionIdentifier) throw new Error("No version to test.");
    const tableName = DB_TABLE_NAMES.EventLog.syncStatus;
    const oldContracts: Contract[] = targetContracts.slice(0, -1);
    const addedContract: Contract = targetContracts[targetContracts.length - 1];
    const dbName: string = new DbEventLogs(versionIdentifier).name;
    await Dexie.delete(dbName);

    // create the database with the constants before the contract was added
    const oldDb = new Dexie(dbName);
    const oldSchema: SchemaDefinition = {};
    for (const eventTableName of getEventTableNames(oldContracts)) {
      oldSchema[eventTableName] = PK_AUTO_INCREMENTED;
    }
    oldSchema[tableName] = "name";
    oldDb.version(DB_VERSIONS.EventLog).stores(oldSchema);
    const oldSyncStatuses: SyncStatusContract[] = oldContracts.map(
      (oldContract) => ({
        ...getInitialDataOfSyncStatusContract(oldContract),
        fetchedBlockNumber: oldContract.creation.blockNumber + 10,
      }),
    );
    await oldDb.table(tableName).bulkAdd(oldSyncStatuses);
    oldDb.close();

    // open it with the current constants: "populate" does not run
    const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
    expect(
      await dbEventLogs.table(tableName).get(addedContract.name),
    ).toBeUndefined();

    // call target
    await addInitialDataOfDbEventLogs(dbEventLogs);

    // the added contract gets the initial data, and the others are kept
    for (const oldSyncStatus of oldSyncStatuses) {
      expect(
        await dbEventLogs.table(tableName).get(oldSyncStatus.name),
      ).toEqual(oldSyncStatus);
    }
    expect(await dbEventLogs.table(tableName).get(addedContract.name)).toEqual(
      getInitialDataOfSyncStatusContract(addedContract),
    );
    dbEventLogs.close();
    await Dexie.delete(dbName);
  });
});

describe("getDbEventLogs", () => {
  const targetChain = TARGET_CHAINS[0];
  const targetProject = targetChain.projects[0];
  const versionIdentifier: VersionIdentifier = {
    chainName: targetChain.name,
    projectName: targetProject.name,
    versionName: targetProject.versions[0].name,
  };

  test("returns the same instance for the same version", () => {
    expect(getDbEventLogs({ ...versionIdentifier })).toBe(
      getDbEventLogs({ ...versionIdentifier }),
    );
  });
  test("returns another instance for another version", () => {
    const otherVersionIdentifier: VersionIdentifier = {
      ...versionIdentifier,
      versionName: targetProject.versions[1].name,
    };
    const dbEventLogs: DbEventLogs = getDbEventLogs(otherVersionIdentifier);
    expect(dbEventLogs).not.toBe(getDbEventLogs(versionIdentifier));
    expect(dbEventLogs.versionIdentifier).toEqual(otherVersionIdentifier);
  });
  test("names the DB only from the version, also when given more keys", () => {
    const dbEventLogs: DbEventLogs = getDbEventLogs({
      contractName: "Augur",
      ...versionIdentifier,
    } as VersionIdentifier);
    expect(dbEventLogs).toBe(getDbEventLogs(versionIdentifier));
    expect(dbEventLogs.name).toBe(new DbEventLogs(versionIdentifier).name);
  });
  test("opens the DB again after it was deleted", async () => {
    const dbEventLogs: DbEventLogs = getDbEventLogs(versionIdentifier);
    const tableName = DB_TABLE_NAMES.EventLog.syncStatus;
    const initialSyncStatuses = await dbEventLogs.table(tableName).toArray();
    await dbEventLogs.table(tableName).clear();

    // Dexie closes the open instance so that the delete can go on.
    await Dexie.delete(dbEventLogs.name);

    // The DB is created again, with the initial data.
    expect(await dbEventLogs.table(tableName).toArray()).toEqual(
      initialSyncStatuses,
    );
    expect(getDbEventLogs(versionIdentifier)).toBe(dbEventLogs);
  });
  test("makes a new instance after the DB failed to open", async () => {
    // Not opened by the tests above.
    const targetVersion = TARGET_CHAINS[1].projects[0].versions[0];
    const otherVersionIdentifier: VersionIdentifier = {
      chainName: TARGET_CHAINS[1].name,
      projectName: TARGET_CHAINS[1].projects[0].name,
      versionName: targetVersion.name,
    };
    const tableName = DB_TABLE_NAMES.EventLog.syncStatus;
    const failedDbEventLogs: DbEventLogs = getDbEventLogs(
      otherVersionIdentifier,
    );
    vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
      throw new Error("open failed");
    });
    await expect(
      failedDbEventLogs.table(tableName).toArray(),
    ).rejects.toThrow();
    vi.restoreAllMocks();
    // Dexie does not open this instance again.
    await expect(
      failedDbEventLogs.table(tableName).toArray(),
    ).rejects.toThrow();

    const dbEventLogs: DbEventLogs = getDbEventLogs(otherVersionIdentifier);
    expect(dbEventLogs).not.toBe(failedDbEventLogs);
    expect(await dbEventLogs.table(tableName).toArray()).toHaveLength(
      extractEventContracts(targetVersion.contracts).length,
    );
    expect(getDbEventLogs(otherVersionIdentifier)).toBe(dbEventLogs);
  });
});
