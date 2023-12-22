import { describe, expect, test } from "vitest";
import type { EventAbiFragment } from "@constants/chains/types";
import * as AID from "./dbEventLogsAddInitialData";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { SyncStatusContract, SyncStatusesEvent } from "./dbTypes";
import { NO_DATA } from "@utils/utilsCostants";
describe("getInitialDataOfSyncStatusContract", () => {
  test("should return correct initial data", () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          for (const targetContract of targetVersion.contracts) {
            const expectedReturnValue: SyncStatusContract = {
              name: targetContract.name,
              isSyncTarget: true,
              isSyncing: false,
              isAbort: false,
              fetchedBlockNumber: targetContract.creation.blockNumber,
              creationBlockNumber: targetContract.creation.blockNumber,
              numOfSyncTargetContract: 1,
              syncStateText: NO_DATA,
              subSyncStatuses: null,
              events: AID.getInitialDataOfSyncStatusesEvent(
                targetContract.events.names,
              ),
            };
            // call target
            const result: SyncStatusContract =
              AID.getInitialDataOfSyncStatusContract(targetContract);
            //check
            expect(result).toEqual(expectedReturnValue);
          }
        }
      }
    }
  });
});

describe("getInitialDataOfSyncStatusesEvent", () => {
  test("should return correct initial data", () => {
    for (const targetChain of TARGET_CHAINS) {
      for (const targetProject of targetChain.projects) {
        for (const targetVersion of targetProject.versions) {
          for (const targetContract of targetVersion.contracts) {
            let expectedReturnValue: SyncStatusesEvent = {};
            const eventNames: EventAbiFragment["name"][] =
              targetContract.events.names;
            for (const eventName of eventNames) {
              expectedReturnValue[eventName] = { recordCount: 0 };
            }
            const result: SyncStatusesEvent =
              AID.getInitialDataOfSyncStatusesEvent(eventNames);
            expect(result).toEqual(expectedReturnValue);
          }
        }
      }
    }
  });
});
