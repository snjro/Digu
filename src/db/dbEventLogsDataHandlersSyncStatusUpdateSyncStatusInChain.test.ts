import { TARGET_CHAINS } from "@constants/chains/_index";
import * as UtilsDb from "@utils/utlisDb";
import "fake-indexeddb/auto";
import {
  describe,
  vi,
  type MockInstance,
  expect,
  test,
  beforeEach,
} from "vitest";
import type { SyncStatusContract } from "./dbTypes";
import type { Contract, Project } from "@constants/chains/types";
import * as UpdateDbItemSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbItemSyncStatus";
import { extractEventContracts } from "@utils/utilsEthers";
import { updateSyncStatusInChain } from "./dbEventLogsDataHandlersSyncStatusUpdateSyncStatusInChain";

const keyOfSyncStatusContract: keyof SyncStatusContract = "isAbort";
const valueOfSyncStatusContract: SyncStatusContract["isAbort"] = false;

describe("updateSyncStatusInChain correctly updates and calls spies", async () => {
  // set spy
  const spyGetTargetChain: MockInstance = vi.spyOn(UtilsDb, "getTargetChain");
  const spyUpdateDbItemSyncStatus: MockInstance = vi.spyOn(
    UpdateDbItemSyncStatus,
    "updateDbItemSyncStatus",
  );

  beforeEach(() => {
    spyGetTargetChain.mockClear();
    spyUpdateDbItemSyncStatus.mockClear();
  });

  for (const targetChain of TARGET_CHAINS) {
    test(`chain: ${targetChain.name}`, async () => {
      // call target
      await updateSyncStatusInChain(
        targetChain.name,
        keyOfSyncStatusContract,
        valueOfSyncStatusContract,
        keyOfSyncStatusContract,
        !valueOfSyncStatusContract,
      );

      expect(spyGetTargetChain).toBeCalledWith({
        chainName: targetChain.name,
      });

      const counter: number = getNumOfCallingUpdateDbItemSyncStatus(
        targetChain.projects,
      );
      expect(spyUpdateDbItemSyncStatus).toBeCalledTimes(counter);
    });
  }
});

function getNumOfCallingUpdateDbItemSyncStatus(
  targetProjects: Project[],
): number {
  let counter: number = 0;
  for (const targetProject of targetProjects) {
    for (const targetVersion of targetProject.versions) {
      // extract contracts that emit eventLogs
      const eventEmittingContracts: Contract[] = extractEventContracts(
        targetVersion.contracts,
      );
      counter += eventEmittingContracts.length;
    }
  }
  return counter;
}
