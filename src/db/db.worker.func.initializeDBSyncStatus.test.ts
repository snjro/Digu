import { TARGET_CHAINS } from "@constants/chains/_index";
import * as InitializeDBSyncStatusForContract from "./db.worker.func.InitializeDBSyncStatusForContract";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as InitializeDBSyncStatus from "./db.worker.func.InitializeDBSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import type { Chain } from "@constants/chains/types";
import { getSyncLockName } from "./constants";
import {
  installFakeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";

vi.mock("./dbEventLogs");
vi.mock("./db.worker.func.InitializeDBSyncStatusForContract");
const spyInitializeDBSyncStatusForContract = vi.spyOn(
  InitializeDBSyncStatusForContract,
  "initializeDBSyncStatusForContract",
);

function countEventContracts(targetChains: Chain[]): number {
  let calledCounter = 0;
  for (const targetChain of targetChains) {
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const numOfEventContract: number = extractEventContracts(
          targetVersion.contracts,
        ).length;
        calledCounter += numOfEventContract;
      }
    }
  }
  return calledCounter;
}

describe("dbWorkerFuncInitializeDBSyncStatus", () => {
  let lockManager: FakeLockManager;
  beforeEach(() => {
    lockManager = installFakeLockManager();
    spyInitializeDBSyncStatusForContract.mockClear();
  });

  test("should initialize DB sync status for all contracts", async () => {
    await InitializeDBSyncStatus.dbWorkerFuncInitializeDBSyncStatus();

    expect(spyInitializeDBSyncStatusForContract).toBeCalledTimes(
      countEventContracts(TARGET_CHAINS),
    );
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

    expect(spyInitializeDBSyncStatusForContract).toBeCalledTimes(
      countEventContracts(TARGET_CHAINS.slice(1)),
    );
  });
});
