import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DbEventLogs } from "./dbEventLogs";
import * as UpdateDbItemSyncStatus from "./dbEventLogsDataHandlersSyncStatusUpdateDbItemSyncStatus";
import { updateDbIsSyncTarget } from "./dbEventLogsDataHandlersSyncStatusUpdateDbIsSyncTarget";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { VersionIdentifier } from "./dbTypes";
import { extractEventContracts } from "@utils/utilsEthers";
import type { Contract } from "@constants/chains/types";

describe("updateDbIsSyncTarget", () => {
  const spyUpdateDbItemSyncStatus = vi.spyOn(
    UpdateDbItemSyncStatus,
    "updateDbItemSyncStatus",
  );
  beforeEach(() => {
    spyUpdateDbItemSyncStatus.mockClear();
  });
  test("should call updateDbItemSyncStatus with correct parameters", async () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          const versionIdentifier: VersionIdentifier = {
            chainName: targetChain.name,
            projectName: targetProject.name,
            versionName: targetVersion.name,
          };

          const dbEventLogs: DbEventLogs = new DbEventLogs(versionIdentifier);
          // extract contracts that emit eventLogs
          const eventEmittingContracts: Contract[] = extractEventContracts(
            targetVersion.contracts,
          );

          for (const targetContract of eventEmittingContracts) {
            for (const newValue of [true, false]) {
              await updateDbIsSyncTarget(
                dbEventLogs,
                targetContract.name,
                newValue,
              );

              expect(spyUpdateDbItemSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "isSyncTarget",
                newValue,
              );

              expect(spyUpdateDbItemSyncStatus).toBeCalledWith(
                dbEventLogs,
                targetContract.name,
                "numOfSyncTargetContract",
                newValue ? 1 : 0,
              );
            }
          }
        }
      }
    }
  });
});
