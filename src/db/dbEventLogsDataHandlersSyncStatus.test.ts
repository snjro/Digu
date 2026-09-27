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
import * as UpdateSyncStatusInChain from "./dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";
import * as UpdateDbRecordSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import type { VersionIdentifier } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import { extractEventContracts } from "@utils/utilsEthers";

describe("startSyncingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    UpdateSyncStatusInChain,
    "updateSyncStatusInChain",
  );
  beforeEach(() => {
    spyUpdateSyncStatusInChain.mockClear().mockResolvedValue(undefined);
  });
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    test(`should be called with chainName:"${chainName}"`, async () => {
      // call target
      await startSyncingInChain(chainName);
      // expect
      expect(spyUpdateSyncStatusInChain).toBeCalledTimes(1);
      expect(spyUpdateSyncStatusInChain).toBeCalledWith(
        chainName,
        "isSyncTarget",
        true,
        { isSyncing: true },
      );
    });
  }
});

describe("startAbortingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    UpdateSyncStatusInChain,
    "updateSyncStatusInChain",
  );
  beforeEach(() => {
    spyUpdateSyncStatusInChain.mockClear().mockResolvedValue(undefined);
  });
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    test(`should be called with chainName:"${chainName}"`, async () => {
      // call target
      await startAbortingInChain(chainName);
      // expect
      expect(spyUpdateSyncStatusInChain).toBeCalledTimes(1);
      expect(spyUpdateSyncStatusInChain).toBeCalledWith(
        chainName,
        "isSyncing",
        true,
        { isAbort: true },
      );
    });
  }
});

describe("stopSyncingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    UpdateSyncStatusInChain,
    "updateSyncStatusInChain",
  );
  beforeEach(() => {
    spyUpdateSyncStatusInChain.mockClear().mockResolvedValue(undefined);
  });
  for (const targetChain of TARGET_CHAINS) {
    const chainName: Chain["name"] = targetChain.name;
    test(`should be called with chainName:"${chainName}"`, async () => {
      // call target
      await stopSyncingInChain(chainName);
      // expect
      // Both fields in one write.
      expect(spyUpdateSyncStatusInChain).toBeCalledTimes(1);
      expect(spyUpdateSyncStatusInChain).toBeCalledWith(
        chainName,
        "isSyncing",
        true,
        { isSyncing: false, isAbort: false },
      );
    });
  }
});

describe("stopSyncingInContract", () => {
  // set spy
  const spyUpdateDbRecordSyncStatus: MockInstance = vi
    .spyOn(UpdateDbRecordSyncStatus, "updateDbRecordSyncStatus")
    .mockResolvedValue(undefined);
  beforeEach(() => {
    spyUpdateDbRecordSyncStatus.mockClear();
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
        for (const targetContract of extractEventContracts(
          targetVersion.contracts,
        )) {
          const contractName: Contract["name"] = targetContract.name;

          test(`should be called with "${chainName}/${targetProject.name}/${targetVersion.name}/${contractName}"`, async () => {
            // call target
            await stopSyncingInContract(dbEventLogs, contractName);
            // expect
            // Both fields in one write.
            expect(spyUpdateDbRecordSyncStatus).toBeCalledTimes(1);
            expect(spyUpdateDbRecordSyncStatus).toBeCalledWith(
              dbEventLogs,
              contractName,
              { isSyncing: false, isAbort: false },
            );
          });
        }
      }
    }
  }
});
