import { TARGET_CHAINS } from "@constants/chains/_index";
import * as InitializeDBSyncStatusForContract from "./db.worker.func.InitializeDBSyncStatusForContract";
import { describe, expect, test, vi } from "vitest";
import * as InitializeDBSyncStatus from "./db.worker.func.InitializeDBSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";

vi.mock("./dbEventLogs");
vi.mock("./db.worker.func.InitializeDBSyncStatusForContract");
const spyInitializeDBSyncStatusForContract = vi.spyOn(
  InitializeDBSyncStatusForContract,
  "initializeDBSyncStatusForContract",
);

describe("dbWorkerFuncInitializeDBSyncStatus", () => {
  test("should initialize DB sync status for all contracts", async () => {
    await InitializeDBSyncStatus.dbWorkerFuncInitializeDBSyncStatus();

    let calledCounter = 0;
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const numOfEventContract: number = extractEventContracts(
            targetVersion.contracts,
          ).length;
          calledCounter += numOfEventContract;
        }
      }
    }

    expect(spyInitializeDBSyncStatusForContract).toBeCalledTimes(calledCounter);
  });
});
