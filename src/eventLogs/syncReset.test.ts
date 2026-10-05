import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "#constants/chains/types.js";
import { DB_NAME, getSyncLockName } from "#db/constants.js";
import { resetDbSyncedData } from "#db/dbResetSyncedData.js";
import { initialDataRpcSetting } from "#db/dbTypes.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";
import {
  forgetWarpSyncConfirmation,
  startWarpSync,
} from "#warpSync/warpSync.js";
import {
  selectWarpSyncState,
  setWarpSyncState,
  storeWarpSync,
} from "#warpSync/warpSyncState.js";
import { get } from "svelte/store";
import {
  installFakeLockManager,
  removeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";
import {
  reloadSyncStatusInChain,
  runWithSyncLock,
  storeSyncLockedByOtherTab,
  waitForSyncLockRelease,
} from "./syncLock";
import {
  resetSyncedData,
  stopWatchingSyncResets,
  watchSyncResetsOfOtherTabs,
} from "./syncReset";

vi.mock("#db/dbResetSyncedData.js", () => ({
  resetDbSyncedData: vi.fn(async () => {}),
}));
vi.mock("#warpSync/warpSync.js", () => ({
  startWarpSync: vi.fn(async () => {}),
  forgetWarpSyncConfirmation: vi.fn(),
}));
// What the real waitForSyncLockRelease() reads once the lock is released.
vi.mock("#db/db.worker.func.InitializeDBSyncStatus.js", () => ({
  initializeDBSyncStatusInChain: vi.fn(async () => {}),
}));
vi.mock("#db/dbEventLogsDataHandlersSyncStatusGetters.js", () => ({
  getDbRecordSyncStatusContract: vi.fn(async () => ({})),
}));
vi.mock("#db/dbChainStatusDataHandlers.js", () => ({
  getDbRecordChainStatus: vi.fn(async () => ({ latestBlockNumber: 0 })),
}));
// The lock is real. runWithSyncLock() calls the real waitForSyncLockRelease();
// the mock is what syncReset.ts calls for the other tabs' resets.
vi.mock("./syncLock", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./syncLock")>()),
  reloadSyncStatusInChain: vi.fn(async () => {}),
  waitForSyncLockRelease: vi.fn(),
}));

const matic = { name: "matic" } as Chain;

function setWarpSync(warpSync: boolean): void {
  storeRpcSettings.updateState("matic", { warpSync });
}

describe("resetSyncedData", () => {
  let lockManager: FakeLockManager;
  beforeEach(() => {
    lockManager = installFakeLockManager();
    setWarpSyncState("matic", { status: "imported", toBlock: 30_000_000 });
    setWarpSync(true);
    vi.mocked(resetDbSyncedData).mockReset().mockResolvedValue(7);
    vi.mocked(startWarpSync).mockClear();
    vi.mocked(reloadSyncStatusInChain).mockClear();
    vi.mocked(waitForSyncLockRelease).mockClear();
    storeSyncLockedByOtherTab.update((state) => ({ ...state, matic: false }));
  });
  afterEach(() => {
    stopWatchingSyncResets();
    removeLockManager();
    setWarpSyncState("matic", { status: "idle" });
    storeRpcSettings.updateState("matic", {
      warpSync: initialDataRpcSetting({ name: "matic" } as Chain).warpSync,
    });
    vi.restoreAllMocks();
  });

  test("deletes the data and reads the chain again, while holding the lock", async () => {
    const held: string[] = [];
    const recordLock = async (): Promise<void> => {
      held.push((await lockManager.query()).held?.[0]?.name ?? "none");
    };
    vi.mocked(resetDbSyncedData).mockImplementationOnce(async () => {
      await recordLock();
      return 7;
    });
    vi.mocked(reloadSyncStatusInChain).mockImplementationOnce(recordLock);

    expect((await resetSyncedData(matic)).result).toBe("reset");
    expect(resetDbSyncedData).toHaveBeenCalledExactlyOnceWith(matic);
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(held).toEqual([getSyncLockName("matic"), getSyncLockName("matic")]);
  });

  test("imports the snapshot again right away when the warp sync is on", async () => {
    const importing: Promise<void> = Promise.resolve();
    vi.mocked(startWarpSync).mockReturnValueOnce(importing);
    expect(await resetSyncedData(matic)).toEqual({
      result: "reset",
      deletedLogCount: 7,
      warpSyncImport: importing,
    });
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "idle",
    );
    expect(startWarpSync).toHaveBeenCalledExactlyOnceWith(matic);
  });

  test("starts the import after it releases the lock", async () => {
    let held: number | undefined;
    vi.mocked(startWarpSync).mockImplementationOnce(async () => {
      held = (await lockManager.query()).held?.length;
    });
    await resetSyncedData(matic);
    expect(held).toBe(0);
  });

  test("does not import when the warp sync is off or the chain has none", async () => {
    setWarpSync(false);
    expect(await resetSyncedData(matic)).toEqual({
      result: "reset",
      deletedLogCount: 7,
    });
    // Every chain of the app has a snapshot now.
    const other = { name: "other" } as unknown as Chain;
    expect((await resetSyncedData(other)).warpSyncImport).toBeUndefined();
    expect(startWarpSync).not.toHaveBeenCalled();
  });

  test("deletes nothing while another tab holds the lock", async () => {
    const spyInfo = vi.spyOn(customLogger, "info").mockImplementation(() => {});
    let release: () => void = () => {};
    void lockManager.request(
      getSyncLockName("matic"),
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
    expect((await resetSyncedData(matic)).result).toBe("busy");
    expect(spyInfo).toHaveBeenCalledWith("The sync lock was not granted.", {
      chainName: "matic",
      errorObject: expect.objectContaining({ name: "TimeoutError" }),
    });
    expect(resetDbSyncedData).not.toHaveBeenCalled();
    expect(startWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "imported",
    );
    // The stores are read again when the other tab releases the lock.
    expect(get(storeSyncLockedByOtherTab).matic).toBe(true);
    release();
    await vi.waitFor(() =>
      expect(get(storeSyncLockedByOtherTab).matic).toBe(false),
    );
  });

  test("deletes nothing while this tab syncs or imports the chain", async () => {
    let finish: () => void = () => {};
    // As this tab's sync does.
    const holding: Promise<boolean> = runWithSyncLock(
      "matic",
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    // No request, so no wait for SYNC_LOCK_TIMEOUT_MS.
    const request = vi.spyOn(lockManager, "request");
    expect((await resetSyncedData(matic)).result).toBe("busy");
    expect(request).not.toHaveBeenCalled();
    // Not read as another tab, which disables the sync toggle.
    expect(get(storeSyncLockedByOtherTab).matic).toBe(false);
    finish();
    expect(await holding).toBe(true);
    setWarpSyncState("matic", { status: "importing" });
    expect((await resetSyncedData(matic)).result).toBe("busy");
    expect(resetDbSyncedData).not.toHaveBeenCalled();
  });

  test("deletes nothing without Web Locks while this tab syncs the chain", async () => {
    removeLockManager();
    let finish: () => void = () => {};
    const holding: Promise<boolean> = runWithSyncLock(
      "matic",
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    expect((await resetSyncedData(matic)).result).toBe("busy");
    expect(resetDbSyncedData).not.toHaveBeenCalled();
    finish();
    expect(await holding).toBe(true);
  });

  test("still reads the chain again after a failure, since some versions may be reset", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    const error = new Error("blocked");
    vi.mocked(resetDbSyncedData).mockRejectedValueOnce(error);

    expect(await resetSyncedData(matic)).toMatchObject({
      result: "failed",
      deletedLogCount: 0,
    });
    expect(spyError).toHaveBeenCalledWith("Reset the synced data.", {
      chainName: "matic",
      errorObject: error,
    });
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "idle",
    );
  });

  test("goes on to read the chain again when forgetting the import throws", async () => {
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    const error = new Error("forget error");
    vi.mocked(forgetWarpSyncConfirmation).mockImplementationOnce(() => {
      throw error;
    });
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    other.addEventListener("message", (event: MessageEvent) =>
      received.push(event.data),
    );

    expect(await resetSyncedData(matic)).toMatchObject({
      result: "reset",
      deletedLogCount: 7,
    });
    expect(spyError).toHaveBeenCalledWith(
      "Forget the warp sync import after the reset.",
      { chainName: "matic", errorObject: error },
    );
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(startWarpSync).toHaveBeenCalledExactlyOnceWith(matic);
    await vi.waitFor(() => expect(received).toEqual([{ chainName: "matic" }]));
    other.close();
    expect((await lockManager.query()).held).toEqual([]);
  });

  test("works without Web Locks (insecure context)", async () => {
    removeLockManager();
    expect((await resetSyncedData(matic)).result).toBe("reset");
    expect(resetDbSyncedData).toHaveBeenCalledTimes(1);
  });
});

describe("watchSyncResetsOfOtherTabs", () => {
  beforeEach(() => {
    installFakeLockManager();
    vi.mocked(waitForSyncLockRelease).mockClear();
  });
  afterEach(() => {
    stopWatchingSyncResets();
    removeLockManager();
    setWarpSyncState("matic", { status: "idle" });
  });

  test("forgets the import and reads the chain again when another tab resets it", async () => {
    watchSyncResetsOfOtherTabs();
    setWarpSyncState("matic", { status: "imported", toBlock: 30_000_000 });
    // The other tab.
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    other.postMessage({ chainName: "matic" });
    other.close();

    await vi.waitFor(() =>
      expect(waitForSyncLockRelease).toHaveBeenCalledExactlyOnceWith("matic"),
    );
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "idle",
    );
  });

  test("tells the other tabs when it resets a chain", async () => {
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    other.addEventListener("message", (event: MessageEvent) =>
      received.push(event.data),
    );
    await resetSyncedData(matic);
    await vi.waitFor(() => expect(received).toEqual([{ chainName: "matic" }]));
    other.close();
  });

  test("does not take its own reset for one of another tab", async () => {
    watchSyncResetsOfOtherTabs();
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    other.addEventListener("message", (event: MessageEvent) =>
      received.push(event.data),
    );
    await resetSyncedData(matic);
    await vi.waitFor(() => expect(received).toHaveLength(1));
    other.close();
    expect(waitForSyncLockRelease).not.toHaveBeenCalled();
  });

  test("watches only once", () => {
    const channel = watchSyncResetsOfOtherTabs();
    expect(watchSyncResetsOfOtherTabs()).toBe(channel);
  });
});
