import "fake-indexeddb/auto";

import {
  describe,
  expect,
  test,
  type MockInstance,
  vi,
  beforeEach,
} from "vitest";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
  stopSyncingInContract,
} from "./dbEventLogsDataHandlersSyncStatus";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { Chain, Contract } from "@constants/chains/types";
import * as SyncStatusUpdaters from "./dbEventLogsDataHandlersSyncStatusUpdaters";
import type { VersionIdentifier } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";

describe("startSyncingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    SyncStatusUpdaters,
    "updateSyncStatusInChain",
  );
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    test(`should be called with chainName:"${chainName}"`, async () => {
      // call target
      await startSyncingInChain(chainName);
      // expect
      expect(spyUpdateSyncStatusInChain).toBeCalledWith(
        chainName,
        "isSyncTarget",
        true,
        "isSyncing",
        true,
      );
    });
  }
});

describe("startAbortingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    SyncStatusUpdaters,
    "updateSyncStatusInChain",
  );
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    test(`should be called with chainName:"${chainName}"`, async () => {
      // call target
      await startAbortingInChain(chainName);
      // expect
      expect(spyUpdateSyncStatusInChain).toBeCalledWith(
        chainName,
        "isSyncing",
        true,
        "isAbort",
        true,
      );
    });
  }
});

describe("stopSyncingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    SyncStatusUpdaters,
    "updateSyncStatusInChain",
  );
  beforeEach(() => {
    spyUpdateSyncStatusInChain.mockReset();
  });
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    test(`should be called with chainName:"${chainName}"`, async () => {
      // call target
      await stopSyncingInChain(chainName);
      // expect
      expect(spyUpdateSyncStatusInChain).toBeCalledTimes(2);
      expect(spyUpdateSyncStatusInChain).toHaveBeenNthCalledWith(
        1,
        chainName,
        "isSyncing",
        true,
        "isAbort",
        false,
      );
      expect(spyUpdateSyncStatusInChain).toHaveBeenNthCalledWith(
        2,
        chainName,
        "isSyncing",
        true,
        "isSyncing",
        false,
      );
    });
  }
});

describe("stopSyncingInContract", () => {
  // set spy
  const spyUpdateDbItemSyncStatus: MockInstance = vi.spyOn(
    SyncStatusUpdaters,
    "updateDbItemSyncStatus",
  );
  beforeEach(() => {
    spyUpdateDbItemSyncStatus.mockReset();
  });
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
        for (const targetContract of targetVersion.contracts) {
          const contractName: Contract["name"] = targetContract.name;

          test(`should be called with chainName:"${chainName}"`, async () => {
            // call target
            await stopSyncingInContract(dbEventLogs, contractName);
            // expect
            expect(spyUpdateDbItemSyncStatus).toBeCalledTimes(2);
            expect(spyUpdateDbItemSyncStatus).toHaveBeenNthCalledWith(
              1,
              dbEventLogs,
              contractName,
              "isSyncing",
              false,
            );
            expect(spyUpdateDbItemSyncStatus).toHaveBeenNthCalledWith(
              2,
              dbEventLogs,
              contractName,
              "isAbort",
              false,
            );
          });
        }
      }
    }
  }
});
