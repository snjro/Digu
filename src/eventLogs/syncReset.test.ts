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
  storeSyncLockedByThisTab,
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
vi.mock("#db/dbEventLogsDataHandlersSyncStatusLoad.js", () => ({
  loadSyncStatusInChain: vi.fn(async () => {}),
}));
vi.mock("#db/dbChainStatusDataHandlers.js", () => ({
  getDbRecordChainStatus: vi.fn(async () => ({ latestBlockNumber: 0 })),
}));
// The lock is real, and runWithSyncLock() calls the real
// waitForSyncLockRelease().
vi.mock("./syncLock", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./syncLock")>()),
  reloadSyncStatusInChain: vi.fn(async () => {}),
}));

const eth = { name: "eth" } as Chain;

function setWarpSync(warpSync: boolean): void {
  storeRpcSettings.updateState("eth", { warpSync });
}

describe("resetSyncedData", () => {
  let lockManager: FakeLockManager;
  beforeEach(() => {
    lockManager = installFakeLockManager();
    setWarpSyncState("eth", { status: "imported", toBlock: 30_000_000 });
    setWarpSync(true);
    vi.mocked(resetDbSyncedData).mockReset().mockResolvedValue(7);
    vi.mocked(startWarpSync).mockClear();
    vi.mocked(reloadSyncStatusInChain).mockClear();
    storeSyncLockedByOtherTab.update((state) => ({ ...state, eth: false }));
  });
  afterEach(() => {
    stopWatchingSyncResets();
    removeLockManager();
    setWarpSyncState("eth", { status: "idle" });
    storeRpcSettings.updateState("eth", {
      warpSync: initialDataRpcSetting({ name: "eth" } as Chain).warpSync,
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

    expect((await resetSyncedData(eth)).result).toBe("reset");
    expect(resetDbSyncedData).toHaveBeenCalledExactlyOnceWith(eth);
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("eth");
    expect(held).toEqual([getSyncLockName("eth"), getSyncLockName("eth")]);
  });

  test("imports the snapshot again right away when the warp sync is on", async () => {
    const importing: Promise<void> = Promise.resolve();
    vi.mocked(startWarpSync).mockReturnValueOnce(importing);
    expect(await resetSyncedData(eth)).toEqual({
      result: "reset",
      deletedLogCount: 7,
      warpSyncImport: importing,
    });
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
      "idle",
    );
    expect(startWarpSync).toHaveBeenCalledExactlyOnceWith(eth);
  });

  test("starts the import after it releases the lock", async () => {
    let held: number | undefined;
    vi.mocked(startWarpSync).mockImplementationOnce(async () => {
      held = (await lockManager.query()).held?.length;
    });
    await resetSyncedData(eth);
    expect(held).toBe(0);
  });

  test("does not import when the warp sync is off or the chain has none", async () => {
    setWarpSync(false);
    expect(await resetSyncedData(eth)).toEqual({
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
      getSyncLockName("eth"),
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
    expect((await resetSyncedData(eth)).result).toBe("busy");
    expect(spyInfo).toHaveBeenCalledWith("The sync lock was not granted.", {
      chainName: "eth",
      errorObject: expect.objectContaining({ name: "TimeoutError" }),
    });
    expect(resetDbSyncedData).not.toHaveBeenCalled();
    expect(startWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
      "imported",
    );
    // The stores are read again when the other tab releases the lock.
    expect(get(storeSyncLockedByOtherTab).eth).toBe(true);
    expect(get(storeSyncLockedByThisTab).eth).toBeUndefined();
    release();
    await vi.waitFor(() =>
      expect(get(storeSyncLockedByOtherTab).eth).toBe(false),
    );
  });

  test.each(["sync", "import"] as const)(
    "deletes nothing while this tab holds the lock for its %s",
    async (kind) => {
      let finish: () => void = () => {};
      const holding: Promise<boolean> = runWithSyncLock(
        "eth",
        kind,
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      // No request, so no wait for SYNC_LOCK_TIMEOUT_MS.
      const request = vi.spyOn(lockManager, "request");
      expect((await resetSyncedData(eth)).result).toBe("busy");
      expect(request).not.toHaveBeenCalled();
      // Not read as another tab, which disables the sync toggle.
      expect(get(storeSyncLockedByOtherTab).eth).toBe(false);
      // The operation that holds the lock stays in the record.
      expect(get(storeSyncLockedByThisTab).eth).toBe(kind);
      finish();
      expect(await holding).toBe(true);
      expect(resetDbSyncedData).not.toHaveBeenCalled();
    },
  );

  test("keeps the reset in the lock record of this tab until it ends", async () => {
    const kinds: (string | undefined)[] = [];
    const recordKind = async (): Promise<void> => {
      kinds.push(get(storeSyncLockedByThisTab).eth);
    };
    vi.mocked(resetDbSyncedData).mockImplementationOnce(async () => {
      await recordKind();
      return 7;
    });
    vi.mocked(reloadSyncStatusInChain).mockImplementationOnce(recordKind);
    const resetting: Promise<unknown> = resetSyncedData(eth);
    // Already while it waits for the lock.
    expect(get(storeSyncLockedByThisTab).eth).toBe("reset");
    await resetting;
    expect(kinds).toEqual(["reset", "reset"]);
    expect(get(storeSyncLockedByThisTab).eth).toBeUndefined();
  });

  test("clears the reset from the lock record also after a failure", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(resetDbSyncedData).mockRejectedValueOnce(new Error("blocked"));
    expect((await resetSyncedData(eth)).result).toBe("failed");
    expect(get(storeSyncLockedByThisTab).eth).toBeUndefined();
    // Thrown in the lock, after the DB was read again.
    vi.mocked(reloadSyncStatusInChain).mockImplementationOnce(() => {
      throw new Error("thrown");
    });
    expect((await resetSyncedData(eth)).result).toBe("failed");
    expect(get(storeSyncLockedByThisTab).eth).toBeUndefined();
  });

  test("deletes nothing without Web Locks while this tab syncs the chain", async () => {
    removeLockManager();
    let finish: () => void = () => {};
    const holding: Promise<boolean> = runWithSyncLock(
      "eth",
      "sync",
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    expect((await resetSyncedData(eth)).result).toBe("busy");
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

    expect(await resetSyncedData(eth)).toMatchObject({
      result: "failed",
      deletedLogCount: 0,
    });
    expect(spyError).toHaveBeenCalledWith("Reset the synced data.", {
      chainName: "eth",
      errorObject: error,
    });
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("eth");
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
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
    watchSyncResetsOfOtherTabs();
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      other.addEventListener("message", (event: MessageEvent) =>
        received.push(event.data),
      );

      expect(await resetSyncedData(eth)).toMatchObject({
        result: "reset",
        deletedLogCount: 7,
      });
      expect(spyError).toHaveBeenCalledWith(
        "Forget the warp sync import after the reset.",
        { chainName: "eth", errorObject: error },
      );
      expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("eth");
      expect(startWarpSync).toHaveBeenCalledExactlyOnceWith(eth);
      await vi.waitFor(() =>
        expect(received).toEqual([{ chainName: "eth" }]),
      );
    } finally {
      other.close();
    }
    expect((await lockManager.query()).held).toEqual([]);
  });

  test("works without Web Locks (insecure context)", async () => {
    removeLockManager();
    expect((await resetSyncedData(eth)).result).toBe("reset");
    expect(resetDbSyncedData).toHaveBeenCalledTimes(1);
  });
});

describe("watchSyncResetsOfOtherTabs", () => {
  beforeEach(() => {
    installFakeLockManager();
    vi.mocked(forgetWarpSyncConfirmation).mockClear();
  });
  afterEach(() => {
    stopWatchingSyncResets();
    removeLockManager();
    setWarpSyncState("eth", { status: "idle" });
  });

  test("forgets the import when another tab resets the chain", async () => {
    watchSyncResetsOfOtherTabs();
    setWarpSyncState("eth", { status: "imported", toBlock: 30_000_000 });
    // The other tab.
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      other.postMessage({ chainName: "eth" });
    } finally {
      other.close();
    }

    await vi.waitFor(() =>
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "idle",
      ),
    );
    expect(forgetWarpSyncConfirmation).toHaveBeenCalledExactlyOnceWith("eth");
    // The chain is read again from the signal of the sync lock.
    expect(get(storeSyncLockedByOtherTab).eth).toBe(false);
  });

  test("tells the other tabs when it resets a chain", async () => {
    watchSyncResetsOfOtherTabs();
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      other.addEventListener("message", (event: MessageEvent) =>
        received.push(event.data),
      );
      await resetSyncedData(eth);
      await vi.waitFor(() =>
        expect(received).toEqual([{ chainName: "eth" }]),
      );
    } finally {
      other.close();
    }
  });

  test("tells nothing before it watches", async () => {
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      other.addEventListener("message", (event: MessageEvent) =>
        received.push(event.data),
      );
      await resetSyncedData(eth);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toEqual([]);
    } finally {
      other.close();
    }
  });

  test("does not take its own reset for one of another tab", async () => {
    watchSyncResetsOfOtherTabs();
    const received: unknown[] = [];
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      other.addEventListener("message", (event: MessageEvent) =>
        received.push(event.data),
      );
      await resetSyncedData(eth);
      await vi.waitFor(() => expect(received).toHaveLength(1));
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      other.close();
    }
    // Only by the reset itself.
    expect(forgetWarpSyncConfirmation).toHaveBeenCalledOnce();
  });

  test("ignores a message without a known chain", async () => {
    watchSyncResetsOfOtherTabs();
    setWarpSyncState("eth", { status: "imported", toBlock: 30_000_000 });
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      // As from a tab on another build.
      other.postMessage(null);
      other.postMessage({});
      other.postMessage({ chainName: "unknown" });
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      other.close();
    }
    expect(forgetWarpSyncConfirmation).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
      "imported",
    );
  });

  test("watches only once", async () => {
    watchSyncResetsOfOtherTabs();
    watchSyncResetsOfOtherTabs();
    const other = new BroadcastChannel(`${DB_NAME.firstName}_syncReset`);
    try {
      other.postMessage({ chainName: "eth" });
    } finally {
      other.close();
    }
    await vi.waitFor(() =>
      expect(forgetWarpSyncConfirmation).toHaveBeenCalled(),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(forgetWarpSyncConfirmation).toHaveBeenCalledOnce();
  });
});
