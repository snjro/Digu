import { TARGET_CHAINS } from "#constants/chains/_index.js";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { get } from "svelte/store";
import {
  describe,
  vi,
  expect,
  onTestFinished,
  test,
  type MockInstance,
} from "vitest";
import type {
  ContractIdentifier,
  SyncStatusContract,
  VersionIdentifier,
} from "./dbTypes";
import type { Contract } from "#constants/chains/types.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { updateSyncStatusInChain } from "./dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";
import {
  startAbortingInChain,
  startSyncingInChain,
  stopSyncingInChain,
} from "./dbEventLogsDataHandlersSyncStatus";
import { customLogger } from "#utils/logger.js";
import { DbEventLogs } from "./dbEventLogs";
import { DB_TABLE_NAMES } from "./constants";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";

const tableNameSyncStatus = DB_TABLE_NAMES.EventLog.syncStatus;

function getStoreSyncStatusContract(
  contractIdentifier: ContractIdentifier,
): SyncStatusContract {
  const { chainName, projectName, versionName, contractName } =
    contractIdentifier;
  return get(storeSyncStatus)[chainName].subSyncStatuses[projectName]
    .subSyncStatuses[versionName].subSyncStatuses[contractName]!;
}

describe("updateSyncStatusInChain", () => {
  test("should return the contracts whose rows it changed", async () => {
    const targetChain = TARGET_CHAINS[0];
    const version = targetChain.projects[0].versions[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetChain.projects[0].name,
      versionName: version.name,
    };
    const [changed, other] = extractEventContracts(version.contracts);
    const dbEventLogs = new DbEventLogs(versionIdentifier);
    try {
      // Only one row matches.
      await dbEventLogs
        .table(tableNameSyncStatus)
        .update(changed.name, { isAbort: true });
      await dbEventLogs
        .table(tableNameSyncStatus)
        .update(other.name, { isAbort: false });

      const contracts: ContractIdentifier[] = await updateSyncStatusInChain(
        targetChain.name,
        "isAbort",
        true,
        { isAbort: false },
      );

      expect(contracts).toContainEqual({
        ...versionIdentifier,
        contractName: changed.name,
      });
      expect(contracts).not.toContainEqual({
        ...versionIdentifier,
        contractName: other.name,
      });
    } finally {
      dbEventLogs.close();
    }
  });
});

describe("startSyncingInChain and stopSyncingInChain with a row of a contract that this build does not know", () => {
  test("the start marks it but does not return it, and the stop clears it", async () => {
    const targetChain = TARGET_CHAINS[0];
    const version = targetChain.projects[0].versions[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetChain.projects[0].name,
      versionName: version.name,
    };
    // The cleanups run in the reverse order, each also when one before it
    // failed, and their errors do not replace that of the test.
    const dbEventLogs = new DbEventLogs(versionIdentifier);
    onTestFinished(() => dbEventLogs.close());
    onTestFinished(async () => {
      await dbEventLogs.table(tableNameSyncStatus).delete("UnknownContract");
    });
    const unknownRow = async (): Promise<SyncStatusContract | undefined> =>
      await dbEventLogs.table(tableNameSyncStatus).get("UnknownContract");
    // The store of this tab has no such contract, and logs an error for the
    // row on every update (#763).
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    onTestFinished(() => spyError.mockRestore());
    let stopped: boolean = false;
    // Clear the rows that the start marked, when the test did not stop.
    onTestFinished(async () => {
      if (!stopped) await stopSyncingInChain(targetChain.name);
    });
    const knownRow: SyncStatusContract | undefined = await dbEventLogs
      .table(tableNameSyncStatus)
      .get(extractEventContracts(version.contracts)[0].name);
    expect(knownRow?.isSyncTarget).toBe(true);
    // As a tab of another build left it.
    await dbEventLogs.table(tableNameSyncStatus).put({
      ...knownRow!,
      name: "UnknownContract",
      isSyncTarget: true,
      isSyncing: false,
    });

    const syncing: ContractIdentifier[] = await startSyncingInChain(
      targetChain.name,
    );

    expect((await unknownRow())?.isSyncing).toBe(true);
    expect(syncing.map((contract) => contract.contractName)).not.toContain(
      "UnknownContract",
    );
    expect(syncing).toContainEqual({
      ...versionIdentifier,
      contractName: knownRow!.name,
    });

    await stopSyncingInChain(targetChain.name);
    stopped = true;

    expect((await unknownRow())?.isSyncing).toBe(false);
    // Every error is for the row that this build does not know.
    expect(spyError).toHaveBeenCalled();
    for (const messages of spyError.mock.calls) {
      expect(messages).toEqual([
        expect.any(String),
        expect.objectContaining({ contractName: "UnknownContract" }),
      ]);
    }
  });

  for (const targetChain of TARGET_CHAINS) {
    test(`should update the table and the store of the matching rows in "${targetChain.name}"`, async () => {
      // The initial rows have isAbort false.
      await updateSyncStatusInChain(targetChain.name, "isAbort", false, {
        isAbort: true,
      });

      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };
          const dbEventLogs = new DbEventLogs(versionIdentifier);
          for (const targetContract of extractEventContracts(
            targetVersion.contracts,
          )) {
            const syncStatusContract: SyncStatusContract | undefined =
              await dbEventLogs
                .table(tableNameSyncStatus)
                .get(targetContract.name);
            expect(syncStatusContract?.isAbort).toBe(true);
            expect(
              getStoreSyncStatusContract({
                ...versionIdentifier,
                contractName: targetContract.name,
              }).isAbort,
            ).toBe(true);
          }
        }
      }
    });
  }

  test("should not update the rows that do not match", async () => {
    const targetChain = TARGET_CHAINS[0];
    const targetProject = targetChain.projects[0];
    const targetVersion = targetProject.versions[0];
    const [matchingContract, otherContract]: Contract[] = extractEventContracts(
      targetVersion.contracts,
    );
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
    };
    const otherContractIdentifier: ContractIdentifier = {
      ...versionIdentifier,
      contractName: otherContract.name,
    };
    const dbEventLogs = new DbEventLogs(versionIdentifier);
    try {
      const table = dbEventLogs.table(tableNameSyncStatus);
      await table.update(matchingContract.name, {
        isSyncing: true,
        isAbort: false,
      });
      await table.update(otherContract.name, {
        isSyncing: false,
        isAbort: false,
      });
      const storeOtherContractBefore: SyncStatusContract =
        getStoreSyncStatusContract(otherContractIdentifier);

      // call target: what startAbortingInChain does
      await updateSyncStatusInChain(targetChain.name, "isSyncing", true, {
        isAbort: true,
      });

      expect((await table.get(matchingContract.name))?.isAbort).toBe(true);
      expect(
        getStoreSyncStatusContract({
          ...versionIdentifier,
          contractName: matchingContract.name,
        }).isAbort,
      ).toBe(true);
      expect((await table.get(otherContract.name))?.isAbort).toBe(false);
      expect(getStoreSyncStatusContract(otherContractIdentifier)).toBe(
        storeOtherContractBefore,
      );
    } finally {
      dbEventLogs.close();
    }
  });

  test("should update several fields in one call", async () => {
    const targetChain = TARGET_CHAINS[0];
    const targetProject = targetChain.projects[0];
    const targetVersion = targetProject.versions[0];
    const targetContract: Contract = extractEventContracts(
      targetVersion.contracts,
    )[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
    };
    const dbEventLogs = new DbEventLogs(versionIdentifier);
    try {
      const table = dbEventLogs.table(tableNameSyncStatus);
      await table.update(targetContract.name, {
        isSyncing: true,
        isAbort: true,
      });

      // call target: what stopSyncingInChain does
      await updateSyncStatusInChain(targetChain.name, "isSyncing", true, {
        isSyncing: false,
        isAbort: false,
      });

      const syncStatusContract: SyncStatusContract | undefined =
        await table.get(targetContract.name);
      expect(syncStatusContract?.isSyncing).toBe(false);
      expect(syncStatusContract?.isAbort).toBe(false);
      const storeSyncStatusContract: SyncStatusContract =
        getStoreSyncStatusContract({
          ...versionIdentifier,
          contractName: targetContract.name,
        });
      expect(storeSyncStatusContract.isSyncing).toBe(false);
      expect(storeSyncStatusContract.isAbort).toBe(false);
    } finally {
      dbEventLogs.close();
    }
  });
});

describe("updateSyncStatusInChain with a row that changes while it runs", () => {
  test("should not set isAbort on a contract stopped after it reads the rows", async () => {
    const targetChain = TARGET_CHAINS[0];
    const targetProject = targetChain.projects[0];
    const targetVersion = targetProject.versions[0];
    const targetContract: Contract = extractEventContracts(
      targetVersion.contracts,
    )[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
    };
    // Another connection, like the sync loop of the contract.
    const otherDbEventLogs = new DbEventLogs(versionIdentifier);
    let spyTable: MockInstance | undefined;
    try {
      await otherDbEventLogs.open();
      await otherDbEventLogs
        .table(tableNameSyncStatus)
        .update(targetContract.name, { isSyncing: true, isAbort: false });

      // The contract stops right after the rows are read.
      let stopContract: Promise<unknown> | undefined;
      const originalTable = DbEventLogs.prototype.table;
      spyTable = vi
        .spyOn(DbEventLogs.prototype, "table")
        .mockImplementation(function (this: DbEventLogs, tableName: string) {
          const table = originalTable.call(this, tableName);
          if (
            stopContract === undefined &&
            this !== otherDbEventLogs &&
            this.name === otherDbEventLogs.name &&
            tableName === tableNameSyncStatus
          ) {
            const originalToArray = table.toArray.bind(table);
            table.toArray = (() =>
              originalToArray().then((rows) => {
                stopContract ??= Dexie.ignoreTransaction(() =>
                  otherDbEventLogs
                    .table(tableNameSyncStatus)
                    .update(targetContract.name, {
                      isSyncing: false,
                      isAbort: false,
                    }),
                );
                return rows;
              })) as typeof table.toArray;
          }
          return table;
        });

      // call target: what startAbortingInChain does
      await updateSyncStatusInChain(targetChain.name, "isSyncing", true, {
        isAbort: true,
      });
      spyTable.mockRestore();
      spyTable = undefined;
      expect(stopContract).toBeDefined();
      await stopContract;

      const syncStatusContract: SyncStatusContract | undefined =
        await otherDbEventLogs
          .table(tableNameSyncStatus)
          .get(targetContract.name);
      expect(syncStatusContract?.isSyncing).toBe(false);
      expect(syncStatusContract?.isAbort).toBe(false);
    } finally {
      spyTable?.mockRestore();
      otherDbEventLogs.close();
    }
  });

  test("should not leave isAbort on a contract aborted while it stops", async () => {
    const targetChain = TARGET_CHAINS[0];
    const targetProject = targetChain.projects[0];
    const targetVersion = targetProject.versions[0];
    const targetContract: Contract = extractEventContracts(
      targetVersion.contracts,
    )[0];
    const versionIdentifier: VersionIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
    };
    const contractIdentifier: ContractIdentifier = {
      ...versionIdentifier,
      contractName: targetContract.name,
    };
    const otherDbEventLogs = new DbEventLogs(versionIdentifier);
    let spyTable: MockInstance | undefined;
    try {
      await otherDbEventLogs.open();
      await otherDbEventLogs
        .table(tableNameSyncStatus)
        .update(targetContract.name, { isSyncing: true, isAbort: false });

      // An abort starts right after the stop reads the rows.
      let abort: Promise<unknown> | undefined;
      const originalTable = DbEventLogs.prototype.table;
      spyTable = vi
        .spyOn(DbEventLogs.prototype, "table")
        .mockImplementation(function (this: DbEventLogs, tableName: string) {
          const table = originalTable.call(this, tableName);
          if (
            abort === undefined &&
            this !== otherDbEventLogs &&
            this.name === otherDbEventLogs.name &&
            tableName === tableNameSyncStatus
          ) {
            const originalToArray = table.toArray.bind(table);
            table.toArray = (() =>
              originalToArray().then((rows) => {
                abort ??= Dexie.ignoreTransaction(() =>
                  startAbortingInChain(targetChain.name),
                );
                return rows;
              })) as typeof table.toArray;
          }
          return table;
        });

      // call target
      await stopSyncingInChain(targetChain.name);
      spyTable.mockRestore();
      spyTable = undefined;
      expect(abort).toBeDefined();
      await abort;

      const syncStatusContract: SyncStatusContract | undefined =
        await otherDbEventLogs
          .table(tableNameSyncStatus)
          .get(targetContract.name);
      expect(syncStatusContract?.isSyncing).toBe(false);
      expect(syncStatusContract?.isAbort).toBe(false);
      const storeSyncStatusContract: SyncStatusContract =
        getStoreSyncStatusContract(contractIdentifier);
      expect(storeSyncStatusContract.isSyncing).toBe(false);
      expect(storeSyncStatusContract.isAbort).toBe(false);
    } finally {
      spyTable?.mockRestore();
      otherDbEventLogs.close();
    }
  });
});

describe("startSyncingInChain with a version whose write fails (#726)", () => {
  // A chain with several versions, each in its own DB.
  const targetChain = TARGET_CHAINS.find((chain) =>
    chain.projects.some((project) => project.versions.length > 1),
  )!;
  const targetProject = targetChain.projects.find(
    (project) => project.versions.length > 1,
  )!;
  const failingVersionName = targetProject.versions[1].name;

  // Makes the writes of the failing version reject: the start's, and also
  // the later ones when `writeBackFails`.
  function failWrites(writeBackFails: boolean): {
    startError: Error;
    writeBackError: Error;
  } {
    const startError = new Error("The start's write failed.");
    const writeBackError = new Error("The write-back failed.");
    let failed: boolean = false;
    const originalTransaction = DbEventLogs.prototype.transaction;
    const spyTransaction = vi
      .spyOn(DbEventLogs.prototype, "transaction")
      .mockImplementation(function (
        this: DbEventLogs,
        ...args: Parameters<DbEventLogs["transaction"]>
      ) {
        if (this.versionIdentifier.versionName === failingVersionName) {
          if (!failed) {
            failed = true;
            return Promise.reject(startError);
          }
          if (writeBackFails) return Promise.reject(writeBackError);
        }
        return (originalTransaction as (...a: unknown[]) => unknown).apply(
          this,
          args,
        );
      } as typeof originalTransaction);
    onTestFinished(() => spyTransaction.mockRestore());
    return { startError, writeBackError };
  }

  async function expectNoContractSyncing(): Promise<void> {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        const dbEventLogs = new DbEventLogs(versionIdentifier);
        try {
          for (const targetContract of extractEventContracts(
            targetVersion.contracts,
          )) {
            const syncStatusContract: SyncStatusContract | undefined =
              await dbEventLogs
                .table(tableNameSyncStatus)
                .get(targetContract.name);
            expect(syncStatusContract?.isSyncing).toBe(false);
            expect(
              getStoreSyncStatusContract({
                ...versionIdentifier,
                contractName: targetContract.name,
              }).isSyncing,
            ).toBe(false);
          }
        } finally {
          dbEventLogs.close();
        }
      }
    }
  }

  test("should leave no contract syncing", async () => {
    // Clear the rows that the start marked, when the test failed.
    onTestFinished(() => stopSyncingInChain(targetChain.name));
    const { startError } = failWrites(false);

    await expect(startSyncingInChain(targetChain.name)).rejects.toBe(
      startError,
    );

    await expectNoContractSyncing();
  });

  test("should clear the other versions and reject with the start's error when the write-back fails too", async () => {
    onTestFinished(() => stopSyncingInChain(targetChain.name));
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    onTestFinished(() => spyError.mockRestore());
    const { startError, writeBackError } = failWrites(true);

    await expect(startSyncingInChain(targetChain.name)).rejects.toBe(
      startError,
    );

    // The failing version marked nothing. The rejection comes before the
    // write-backs of the other versions have committed.
    await vi.waitFor(() => expectNoContractSyncing());
    expect(spyError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        chainName: targetChain.name,
        errorObject: writeBackError,
      }),
    );
  });
});

describe("startSyncingInChain with isAbort left by a stop whose write-back failed (#795)", () => {
  test("should clear isAbort in the DB and the store", async () => {
    const targetChain = TARGET_CHAINS[0];
    const targetProject = targetChain.projects[0];
    const targetVersion = targetProject.versions[0];
    const contractIdentifier: ContractIdentifier = {
      chainName: targetChain.name,
      projectName: targetProject.name,
      versionName: targetVersion.name,
      contractName: extractEventContracts(targetVersion.contracts)[0].name,
    };
    const dbEventLogs = new DbEventLogs(contractIdentifier);
    onTestFinished(() => dbEventLogs.close());
    onTestFinished(() => stopSyncingInChain(targetChain.name));
    // The abort committed, and the stop that clears it failed. Without Web
    // Locks, the start does not read the rows again.
    const left: Partial<SyncStatusContract> = {
      isSyncing: true,
      isAbort: true,
    };
    await dbEventLogs
      .table(tableNameSyncStatus)
      .update(contractIdentifier.contractName, left);
    storeSyncStatus.updateState(contractIdentifier, left);

    await startSyncingInChain(targetChain.name);

    const row: SyncStatusContract | undefined = await dbEventLogs
      .table(tableNameSyncStatus)
      .get(contractIdentifier.contractName);
    expect(row?.isSyncing).toBe(true);
    expect(row?.isAbort).toBe(false);
    expect(getStoreSyncStatusContract(contractIdentifier).isAbort).toBe(false);
  });
});
