import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "vitest";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "@constants/chains/_index";
import type { ContractName } from "@constants/chains/types";
import { DB_TABLE_NAMES } from "@db/constants";
import { DbEventLogs } from "@db/dbEventLogs";
import { updateDbIsSyncTarget } from "@db/dbEventLogsDataHandlersSyncStatusUpdateDbIsSyncTarget";
import type { SyncStatusContract, VersionIdentifier } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { getInitialState } from "@stores/storeSyncStatusGetInitialState";
import { extractEventContracts } from "@utils/utilsEthers";
import { toggleIsSyncTarget } from "./toggleSyncTarget";

type Target = {
  versionIdentifier: VersionIdentifier;
  contractName: ContractName;
};

const ALL_TARGETS: Target[] = TARGET_CHAINS.flatMap((targetChain) =>
  targetChain.projects.flatMap((targetProject) =>
    targetProject.versions.flatMap((targetVersion) =>
      extractEventContracts(targetVersion.contracts).map((targetContract) => ({
        versionIdentifier: {
          chainName: targetChain.name,
          projectName: targetProject.name,
          versionName: targetVersion.name,
        },
        contractName: targetContract.name,
      })),
    ),
  ),
);

// The first chain, project and version, and the first version with two or
// more contracts, so that a toggle can change only a part of them.
const chainName = TARGET_CHAINS[0].name;
const projectName = TARGET_CHAINS[0].projects[0].name;
const version = TARGET_CHAINS[0].projects[0].versions.find(
  (targetVersion) => extractEventContracts(targetVersion.contracts).length > 1,
);
if (!version) throw new Error("No version with two or more contracts");
const versionName = version.name;

const inChain = (target: Target): boolean =>
  target.versionIdentifier.chainName === chainName;
const inProject = (target: Target): boolean =>
  inChain(target) && target.versionIdentifier.projectName === projectName;
const inVersion = (target: Target): boolean =>
  inProject(target) && target.versionIdentifier.versionName === versionName;
const versionTargets: Target[] = ALL_TARGETS.filter(inVersion);
const [firstContract, secondContract] = versionTargets;

async function dbIsSyncTarget(target: Target): Promise<boolean> {
  const syncStatus: SyncStatusContract | undefined = await new DbEventLogs(
    target.versionIdentifier,
  )
    .table(DB_TABLE_NAMES.EventLog.syncStatus)
    .get(target.contractName);
  if (!syncStatus) throw new Error(`No sync status of ${target.contractName}`);
  return syncStatus.isSyncTarget;
}
function storeIsSyncTarget(target: Target): boolean {
  const { chainName, projectName, versionName } = target.versionIdentifier;
  return get(storeSyncStatus)[chainName].subSyncStatuses[projectName]
    .subSyncStatuses[versionName].subSyncStatuses[target.contractName]
    .isSyncTarget;
}
// Expects isSyncTarget of each contract in the DB and in the store.
async function expectIsSyncTarget(
  expected: (target: Target) => boolean,
): Promise<void> {
  for (const target of ALL_TARGETS) {
    const name = `${Object.values(target.versionIdentifier).join("/")}/${target.contractName}`;
    expect(await dbIsSyncTarget(target), `DB ${name}`).toBe(expected(target));
    expect(storeIsSyncTarget(target), `store ${name}`).toBe(expected(target));
  }
}
function storeVersionIsSyncTarget(): boolean {
  return get(storeSyncStatus)[chainName].subSyncStatuses[projectName]
    .subSyncStatuses[versionName].isSyncTarget;
}

describe("toggleIsSyncTarget", () => {
  beforeEach(async () => {
    // The DB is kept between the tests, so every contract is set back to a sync target.
    for (const target of ALL_TARGETS) {
      await updateDbIsSyncTarget(
        new DbEventLogs(target.versionIdentifier),
        target.contractName,
        true,
      );
    }
    storeSyncStatus.set(getInitialState());
  });

  test("all contracts are sync targets at first", async () => {
    expect(versionTargets.length).toBeGreaterThan(1);
    await expectIsSyncTarget(() => true);
  });

  test("a contract toggles only itself", async () => {
    const isFirst = (target: Target): boolean =>
      inVersion(target) && target.contractName === firstContract.contractName;

    await toggleIsSyncTarget(
      chainName,
      projectName,
      versionName,
      firstContract.contractName,
    );
    await expectIsSyncTarget((target) => !isFirst(target));
    // Another contract of the version is still a sync target.
    expect(storeVersionIsSyncTarget()).toBe(true);

    await toggleIsSyncTarget(
      chainName,
      projectName,
      versionName,
      firstContract.contractName,
    );
    await expectIsSyncTarget(() => true);
  });

  const levels: [string, (target: Target) => boolean, () => Promise<void>][] = [
    [
      "a version",
      inVersion,
      () => toggleIsSyncTarget(chainName, projectName, versionName),
    ],
    ["a project", inProject, () => toggleIsSyncTarget(chainName, projectName)],
    ["a chain", inChain, () => toggleIsSyncTarget(chainName)],
  ];

  test.each(levels)(
    "%s toggles all the contracts in it",
    async (_, isIn, toggle) => {
      await toggle();
      await expectIsSyncTarget((target) => !isIn(target));

      await toggle();
      await expectIsSyncTarget(() => true);
    },
  );

  test.each(levels)(
    "%s with some contracts off turns all the contracts in it off",
    async (_, isIn, toggle) => {
      await toggleIsSyncTarget(
        chainName,
        projectName,
        versionName,
        secondContract.contractName,
      );

      await toggle();
      await expectIsSyncTarget((target) => !isIn(target));
    },
  );
});
