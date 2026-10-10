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
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import type { Chain, Contract } from "#constants/chains/types.js";
import * as UpdateSyncStatusInChain from "./dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";
import * as UpdateDbRecordSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbRecordSyncStatus";
import type { ContractIdentifier, VersionIdentifier } from "./dbTypes";
import { DbEventLogs } from "./dbEventLogs";
import { extractEventContracts } from "#utils/utilsEthers.js";

describe("startSyncingInChain", () => {
  // set spy
  const spyUpdateSyncStatusInChain: MockInstance = vi.spyOn(
    UpdateSyncStatusInChain,
    "updateSyncStatusInChain",
  );
  beforeEach(() => {
    spyUpdateSyncStatusInChain.mockClear().mockResolvedValue([]);
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
  test("should return the marked contracts that this build knows only", async () => {
    const targetChain: Chain = TARGET_CHAINS[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetChain.projects[0].name,
      versionName: targetChain.projects[0].versions[0].name,
    };
    const known: ContractIdentifier = {
      ...versionIdentifier,
      contractName: extractEventContracts(
        targetChain.projects[0].versions[0].contracts,
      )[0].name,
    };
    // Rows of contracts that this build does not know, one of them named like
    // a member of Object.prototype.
    spyUpdateSyncStatusInChain.mockResolvedValue([
      known,
      { ...versionIdentifier, contractName: "UnknownContract" },
      { ...versionIdentifier, contractName: "constructor" },
    ]);

    expect(await startSyncingInChain(targetChain.name)).toEqual([known]);
  });
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
