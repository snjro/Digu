import { TARGET_CHAINS } from "@constants/chains/_index";
import * as InitializeDBSyncStatusForContract from "./db.worker.func.InitializeDBSyncStatusForContract";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as InitializeDBSyncStatus from "./db.worker.func.InitializeDBSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import type { Chain, Contract } from "@constants/chains/types";
import type { VersionIdentifier } from "./dbTypes";
import { DbEventLogs, getDbEventLogs } from "./dbEventLogs";
import { getSyncLockName } from "./constants";
import {
  installFakeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";

vi.mock("./dbEventLogs");
vi.mocked(getDbEventLogs).mockImplementation(
  (versionIdentifier) => new DbEventLogs(versionIdentifier),
);
vi.mock("./db.worker.func.InitializeDBSyncStatusForContract");
const spyInitializeDBSyncStatusForContract = vi.spyOn(
  InitializeDBSyncStatusForContract,
  "initializeDBSyncStatusForContract",
);

type CalledArgs = {
  versionIdentifier: VersionIdentifier;
  contract: Contract;
  recount: boolean;
};

function expectedArgs(targetChains: Chain[]): CalledArgs[] {
  const args: CalledArgs[] = [];
  for (const targetChain of targetChains) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionIdentifier: VersionIdentifier = {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        };
        for (const contract of extractEventContracts(targetVersion.contracts)) {
          // The startup is the only place that recounts the records.
          args.push({ versionIdentifier, contract, recount: true });
        }
      }
    }
  }
  return args;
}

// getDbEventLogs is mocked, so find the version from the call that returned
// the instance.
function calledArgs(): CalledArgs[] {
  const mockedGetDbEventLogs = vi.mocked(getDbEventLogs).mock;
  const instances: DbEventLogs[] = mockedGetDbEventLogs.results.map(
    (result) => result.value,
  );
  return spyInitializeDBSyncStatusForContract.mock.calls.map(
    ([dbEventLogs, contract, recount]) => ({
      versionIdentifier:
        mockedGetDbEventLogs.calls[instances.indexOf(dbEventLogs)][0],
      contract,
      recount,
    }),
  );
}

describe("dbWorkerFuncInitializeDBSyncStatus", () => {
  let lockManager: FakeLockManager;
  beforeEach(() => {
    lockManager = installFakeLockManager();
    spyInitializeDBSyncStatusForContract.mockClear();
    vi.mocked(getDbEventLogs).mockClear();
  });

  test("should initialize DB sync status for all contracts", async () => {
    await InitializeDBSyncStatus.dbWorkerFuncInitializeDBSyncStatus();

    const expected: CalledArgs[] = expectedArgs(TARGET_CHAINS);
    expect(calledArgs()).toHaveLength(expected.length);
    expect(calledArgs()).toEqual(expect.arrayContaining(expected));
  });

  test("should skip a chain that another tab syncs", async () => {
    const syncingChain: Chain = TARGET_CHAINS[0];
    let release: () => void = () => {};
    const heldLock = lockManager.request(
      getSyncLockName(syncingChain.name),
      () => new Promise<void>((resolve) => (release = resolve)),
    );

    await InitializeDBSyncStatus.dbWorkerFuncInitializeDBSyncStatus();
    release();
    await heldLock;

    const expected: CalledArgs[] = expectedArgs(TARGET_CHAINS.slice(1));
    expect(calledArgs()).toHaveLength(expected.length);
    expect(calledArgs()).toEqual(expect.arrayContaining(expected));
  });
});
