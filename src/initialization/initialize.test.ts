import "fake-indexeddb/auto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import { DB_TABLE_NAMES } from "#db/constants.js";
import { startDbWorker } from "#db/db.worker.portal.js";
import type {
  DbWorkerMessage,
  TargetFunctionName,
} from "#db/db.worker.types.js";
import { DbEventLogs } from "#db/dbEventLogs.js";
import { dbSettings } from "#db/dbSettings.js";
import { syncStatusContract } from "#eventLogs/eventLogsContract.js";
import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";
import { extractEventContracts } from "#utils/utilsEthers.js";
import { installFakeLockManager } from "../testUtils/fakeLockManager";
import { holdOperationOfOtherTab } from "../testUtils/otherTabOperation";
import { forgetInitialization, initialize } from "./initialize";
import { initializeStore } from "./initializeStore";
import { watchRpcSettings } from "./watchRpcSettings";

vi.mock("$app/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$app/env")>()),
  browser: true,
}));
// Runs as it is, and can fail once in a test.
vi.mock("./initializeStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./initializeStore")>();
  return { initializeStore: vi.fn(actual.initializeStore) };
});
// Runs the Worker jobs in the page.
vi.mock("#db/db.worker.portal.js", async () => {
  const { executeTargetFunction } =
    await import("#db/db.worker.executeTargetFunction.js");
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
    forgetInitialization();
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
      .update(chain.name, { rpc: "https://other-tab" });

    await vi.waitFor(() => {
      expect(get(storeRpcSettings)[chain.name].rpc).toBe("https://other-tab");
    });
  });

  test("waits for a chain whose sync lock another tab holds", async () => {
    installFakeLockManager();
    const { held: heldLock, release: releaseLock } = holdOperationOfOtherTab(
      chain.name,
    );

    await initialize();
    expect(get(storeSyncLockedByOtherTab)[chain.name]).toBe(true);

    releaseLock();
    await heldLock;
    await vi.waitFor(() => {
      expect(get(storeSyncLockedByOtherTab)[chain.name]).toBe(false);
    });
  });

  test("runs once when it is called again", async () => {
    installFakeLockManager();
    vi.mocked(startDbWorker).mockClear();

    const first = initialize();
    await first;
    const second = initialize();
    await second;

    expect(second).toBe(first);
    expect(startDbWorker).toHaveBeenCalledTimes(2);
  });

  test("runs again after a failure", async () => {
    installFakeLockManager();
    vi.mocked(initializeStore).mockClear();
    // initializeStore runs after the Worker jobs end, so the failed run leaves
    // nothing running.
    vi.mocked(initializeStore).mockRejectedValueOnce(new Error("test failure"));

    const failed = initialize();
    await expect(failed).rejects.toThrow("test failure");
    const retried = initialize();
    await expect(retried).resolves.toBeUndefined();

    expect(retried).not.toBe(failed);
    expect(initializeStore).toHaveBeenCalledTimes(2);
  });
});
