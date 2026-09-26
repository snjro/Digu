import "fake-indexeddb/auto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { DB_TABLE_NAMES, getSyncLockName } from "@db/constants";
import { startDbWorker } from "@db/db.worker.portal";
import type { DbWorkerMessage, TargetFunctionName } from "@db/db.worker.types";
import { DbEventLogs } from "@db/dbEventLogs";
import { dbSettings } from "@db/dbSettings";
import { syncStatusContract } from "@eventLogs/eventLogsContract";
import { storeSyncLockedByOtherTab } from "@eventLogs/syncLock";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { customLogger } from "@utils/logger";
import { extractEventContracts } from "@utils/utilsEthers";
import { installFakeLockManager } from "../testUtils/fakeLockManager";
import { initialize } from "./initialize";
import { watchRpcSettings } from "./watchRpcSettings";

vi.mock("$app/environment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$app/environment")>()),
  browser: true,
}));
// Runs the Worker jobs in the page.
vi.mock("@db/db.worker.portal", async () => {
  const { executeTargetFunction } =
    await import("@db/db.worker.executeTargetFunction");
  return {
    startDbWorker: vi.fn((message: DbWorkerMessage<TargetFunctionName>) =>
      executeTargetFunction(message.targetFunctionName, message.params),
    ),
  };
});

const chain = TARGET_CHAINS[0];
const version = chain.projects[0].versions[0];
const versionIdentifier = {
  chainName: chain.name,
  projectName: chain.projects[0].name,
  versionName: version.name,
};

describe("initialize", () => {
  afterEach(() => {
    // The subscription that initialize() started.
    watchRpcSettings().unsubscribe();
    vi.restoreAllMocks();
  });

  test("fills the DBs in the Worker jobs and loads them into the stores", async () => {
    installFakeLockManager();
    const spyError = vi.spyOn(customLogger, "error");

    await initialize();

    expect(startDbWorker).toHaveBeenCalledWith({
      targetFunctionName: "initializeDbSettings",
      params: undefined,
    });
    expect(startDbWorker).toHaveBeenCalledWith({
      targetFunctionName: "initializeDBSyncStatus",
      params: undefined,
    });
    expect(get(storeRpcSettings)[chain.name]).toEqual(
      await dbSettings
        .table(DB_TABLE_NAMES.Settings.rpcSettings)
        .get(chain.name),
    );
    const contractName = extractEventContracts(version.contracts)[0].name;
    // The store works out the text from the flags.
    expect(syncStatusContract({ ...versionIdentifier, contractName })).toEqual({
      ...(await new DbEventLogs(versionIdentifier)
        .table(DB_TABLE_NAMES.EventLog.syncStatus)
        .get(contractName)),
      syncStateText: "stopped",
    });
    expect(spyError).not.toHaveBeenCalled();
  });

  test("watches the RPC settings in the DB", async () => {
    installFakeLockManager();

    await initialize();
    // Written like another tab does: the DB only, not this tab's store.
    await dbSettings
      .table(DB_TABLE_NAMES.Settings.rpcSettings)
      .update(chain.name, { bulkUnit: 321 });

    await vi.waitFor(() => {
      expect(get(storeRpcSettings)[chain.name].bulkUnit).toBe(321);
    });
  });

  test("waits for a chain whose sync lock another tab holds", async () => {
    const lockManager = installFakeLockManager();
    let releaseLock: () => void = () => {};
    const heldLock = lockManager.request(
      getSyncLockName(chain.name),
      () => new Promise<void>((resolve) => (releaseLock = resolve)),
    );

    await initialize();
    expect(get(storeSyncLockedByOtherTab)[chain.name]).toBe(true);

    releaseLock();
    await heldLock;
    await vi.waitFor(() => {
      expect(get(storeSyncLockedByOtherTab)[chain.name]).toBe(false);
    });
  });
});
