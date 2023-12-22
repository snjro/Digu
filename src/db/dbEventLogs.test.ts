import "fake-indexeddb/auto";
import { DbEventLogs } from "./dbEventLogs";
import { DB_NAME, DB_TABLE_NAMES, DB_VERSIONS } from "@db/constants";
import { describe, expect, test } from "vitest";
import type { VersionIdentifier } from "./dbTypes";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { getEventTableNames } from "@utils/utlisDb";

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

        test("should set type correctly", () => {
          expect(dbEventLogs).toBeInstanceOf(DbEventLogs);
        });

        test("should set versionIdentifier correctly", () => {
          expect(dbEventLogs.versionIdentifier).toEqual(versionIdentifier);
        });
        test("should set up the database with the correct schema definition", () => {
          let expectedDbSchema: any = {};
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
                unique: false,
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
              unique: false,
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
