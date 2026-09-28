import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "@constants/chains/types";
import { DB_NAME, getSyncLockName } from "@db/constants";
import { resetDbSyncedData } from "@db/dbResetSyncedData";
import { initialDataRpcSetting } from "@db/dbTypes";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { customLogger } from "@utils/logger";
import { startWarpSync } from "@warpSync/warpSync";
import {
  selectWarpSyncState,
  setWarpSyncState,
  storeWarpSync,
} from "@warpSync/warpSyncState";
import { get } from "svelte/store";
import {
  installFakeLockManager,
  removeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";
import {
  isSyncedByThisTab,
  reloadSyncStatusInChain,
  waitForSyncLockRelease,
} from "./syncLock";
import {
  resetSyncedData,
  stopWatchingSyncResets,
  watchSyncResetsOfOtherTabs,
} from "./syncReset";

vi.mock("@db/dbResetSyncedData", () => ({
  resetDbSyncedData: vi.fn(async () => {}),
}));
vi.mock("@warpSync/warpSync", () => ({
  startWarpSync: vi.fn(async () => {}),
  forgetWarpSyncConfirmation: vi.fn(),
}));
vi.mock("./syncLock", () => ({
  isSyncedByThisTab: vi.fn(() => false),
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
    vi.spyOn(customLogger, "info").mockImplementation(() => {});
    let release: () => void = () => {};
    void lockManager.request(
      getSyncLockName("matic"),
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
    expect((await resetSyncedData(matic)).result).toBe("busy");
    expect(resetDbSyncedData).not.toHaveBeenCalled();
    expect(startWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "imported",
    );
    // The stores are read again when the other tab releases the lock.
    expect(waitForSyncLockRelease).toHaveBeenCalledExactlyOnceWith("matic");
    release();
  });

  test("deletes nothing while this tab syncs or imports the chain", async () => {
    vi.mocked(isSyncedByThisTab).mockReturnValueOnce(true);
    expect((await resetSyncedData(matic)).result).toBe("busy");
    setWarpSyncState("matic", { status: "importing" });
    expect((await resetSyncedData(matic)).result).toBe("busy");
    expect(resetDbSyncedData).not.toHaveBeenCalled();
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
