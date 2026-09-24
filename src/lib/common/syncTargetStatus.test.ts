import { describe, expect, test } from "vitest";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type {
  SubSyncStatuses,
  SyncStatus,
  SyncStatusesChain,
} from "@db/dbTypes";
import {
  getTargetSyncStatus,
  isSyncTargetIndeterminate,
  syncTargetLabelText,
  type SyncTargetLabelText,
} from "./syncTargetStatus";

function subSyncStatuses(...isSyncTargets: boolean[]): SubSyncStatuses {
  return Object.fromEntries(
    isSyncTargets.map((isSyncTarget, index) => [
      `sub${index}`,
      { isSyncTarget: isSyncTarget, subSyncStatuses: null },
    ]),
  ) as SubSyncStatuses;
}
function syncStatus(
  isSyncTarget: boolean,
  subStatuses: SubSyncStatuses,
): SyncStatus {
  return { isSyncTarget, subSyncStatuses: subStatuses } as SyncStatus;
}

describe("isSyncTargetIndeterminate", () => {
  test.each<[string, SubSyncStatuses, boolean]>([
    ["null", null, false],
    ["no sub statuses", subSyncStatuses(), false],
    ["one sub status", subSyncStatuses(true), false],
    ["all true", subSyncStatuses(true, true, true), false],
    ["all false", subSyncStatuses(false, false), false],
    ["first differs", subSyncStatuses(false, true, true), true],
    ["last differs", subSyncStatuses(true, true, false), true],
  ])("%s gives %j", (_, subStatuses, expected) => {
    expect(isSyncTargetIndeterminate(subStatuses)).toBe(expected);
  });
});

describe("syncTargetLabelText", () => {
  test.each<[string, SyncStatus, SyncTargetLabelText]>([
    [
      "mixed sub statuses",
      syncStatus(true, subSyncStatuses(true, false)),
      "Partially",
    ],
    [
      "same sub statuses, target",
      syncStatus(true, subSyncStatuses(true)),
      "All",
    ],
    [
      "same sub statuses, not target",
      syncStatus(false, subSyncStatuses(false)),
      "Nothing",
    ],
    ["empty sub statuses, target", syncStatus(true, subSyncStatuses()), "All"],
    ["no sub statuses, target", syncStatus(true, null), "Yes"],
    ["no sub statuses, not target", syncStatus(false, null), "No"],
  ])("%s gives %j", (_, targetSyncStatus, expected) => {
    expect(syncTargetLabelText(targetSyncStatus)).toBe(expected);
  });
});

describe("getTargetSyncStatus", () => {
  const contractStatus = { name: "contract" };
  const versionStatus = {
    name: "version",
    subSyncStatuses: { contract: contractStatus },
  };
  const projectStatus = {
    name: "project",
    subSyncStatuses: { version: versionStatus },
  };
  const chainStatus = {
    name: "chain",
    subSyncStatuses: { project: projectStatus },
  };
  const syncStatuses = { chain: chainStatus } as unknown as SyncStatusesChain;
  const targetChain = { name: "chain" } as Chain;
  const targetProject = { name: "project" } as Project;
  const targetVersion = { name: "version" } as Version;
  const targetContract = { name: "contract" } as Contract;

  test("chain only gives the chain status", () => {
    expect(getTargetSyncStatus(syncStatuses, targetChain)).toBe(chainStatus);
  });
  test("chain and project give the project status", () => {
    expect(getTargetSyncStatus(syncStatuses, targetChain, targetProject)).toBe(
      projectStatus,
    );
  });
  test("chain, project and version give the version status", () => {
    expect(
      getTargetSyncStatus(
        syncStatuses,
        targetChain,
        targetProject,
        targetVersion,
      ),
    ).toBe(versionStatus);
  });
  test("all four give the contract status", () => {
    expect(
      getTargetSyncStatus(
        syncStatuses,
        targetChain,
        targetProject,
        targetVersion,
        targetContract,
      ),
    ).toBe(contractStatus);
  });
});
