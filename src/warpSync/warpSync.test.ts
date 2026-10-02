import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "#constants/chains/types.js";
import { getSyncLockName } from "#db/constants.js";
import { initialDataRpcSetting } from "#db/dbTypes.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { customLogger } from "#utils/logger.js";
import { get } from "svelte/store";
import {
  installFakeLockManager,
  removeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";
import {
  confirmWarpSync,
  declineWarpSync,
  forgetWarpSyncConfirmation,
  importWarpSyncBeforeSync,
  startWarpSync,
  waitForWarpSync,
} from "./warpSync";
import { fetchWarpSyncManifest } from "./warpSyncFetch";
import { getWarpSyncPending, importWarpSync } from "./warpSyncImport";
import {
  isSyncedByThisTab,
  reloadSyncStatusInChain,
  waitForSyncLockRelease,
} from "#eventLogs/syncLock.js";
import {
  selectWarpSyncState,
  setWarpSyncState,
  stopWarpSync,
  storeWarpSync,
  type WarpSyncPending,
} from "./warpSyncState";
import type { WarpSyncManifest } from "./warpSyncTypes";

vi.mock("./warpSyncFetch", () => ({ fetchWarpSyncManifest: vi.fn() }));
vi.mock("./warpSyncImport", () => ({
  importWarpSync: vi.fn(),
  getWarpSyncPending: vi.fn(),
}));
vi.mock("#eventLogs/syncLock.js", () => ({
  isSyncedByThisTab: vi.fn(() => false),
  reloadSyncStatusInChain: vi.fn(async () => {}),
  waitForSyncLockRelease: vi.fn(),
}));

const matic = { name: "matic" } as Chain;
const manifest = {
  runs: [{ createdAt: "2026-09-28T00:00:00.000Z", toBlock: 30_000_000 }],
  totals: { logCount: 2_000_000 },
} as WarpSyncManifest;
const small: WarpSyncPending = {
  logCount: 4_140,
  snapshotLogCount: 4_140,
  bytes: 427_701,
  rawBytes: 2_985_902,
  files: 4,
};
// Above 10,000 logs: asked first.
const large: WarpSyncPending = {
  logCount: 2_000_000,
  snapshotLogCount: 2_000_000,
  bytes: 170_000_000,
  rawBytes: 1_600_000_000,
  files: 100,
};

function setWarpSync(chainName: string, warpSync: boolean): void {
  storeRpcSettings.updateState(chainName, { warpSync });
}

describe("warpSync", () => {
  let lockManager: FakeLockManager;
  beforeEach(() => {
    lockManager = installFakeLockManager();
    setWarpSyncState("matic", { status: "idle" });
    setWarpSyncState("eth", { status: "idle" });
    setWarpSync("matic", true);
    vi.mocked(fetchWarpSyncManifest).mockReset().mockResolvedValue(manifest);
    vi.mocked(importWarpSync).mockReset().mockResolvedValue(30_000_000);
    vi.mocked(getWarpSyncPending).mockReset().mockResolvedValue(small);
    forgetWarpSyncConfirmation("matic");
    vi.mocked(reloadSyncStatusInChain).mockClear();
    vi.mocked(waitForSyncLockRelease).mockClear();
  });
  afterEach(() => {
    removeLockManager();
    storeRpcSettings.updateState("matic", {
      warpSync: initialDataRpcSetting({ name: "matic" } as Chain).warpSync,
    });
    vi.restoreAllMocks();
  });

  test("imports the snapshot of the chain, and then says up to where", async () => {
    await startWarpSync(matic);
    expect(importWarpSync).toHaveBeenCalledExactlyOnceWith(
      matic,
      manifest,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(selectWarpSyncState(get(storeWarpSync), "matic")).toEqual({
      status: "imported",
      toBlock: 30_000_000,
      createdAt: "2026-09-28T00:00:00.000Z",
    });
  });

  test("shows that it imports while it does", async () => {
    let finish: (value: number) => void = () => {};
    vi.mocked(importWarpSync).mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );
    const importing = startWarpSync(matic);
    await vi.waitFor(() =>
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "importing",
      ),
    );
    finish(30_000_000);
    await importing;
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "imported",
    );
  });

  test("imports once: again only after a failure", async () => {
    await startWarpSync(matic);
    await startWarpSync(matic);
    expect(importWarpSync).toHaveBeenCalledTimes(1);

    setWarpSyncState("matic", { status: "failed" });
    await startWarpSync(matic);
    expect(importWarpSync).toHaveBeenCalledTimes(2);
  });

  test("shares the running import", async () => {
    const first = startWarpSync(matic);
    const second = startWarpSync(matic);
    expect(second).toBe(first);
    await first;
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("does nothing when it is off, or for a chain without a snapshot", async () => {
    setWarpSync("matic", false);
    await startWarpSync(matic);
    // Every chain of the app has a snapshot now.
    await startWarpSync({ name: "other" } as unknown as Chain);
    expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
  });

  test("fetches nothing without DecompressionStream, says so, and does not try again", async () => {
    vi.stubGlobal("DecompressionStream", undefined);
    try {
      await startWarpSync(matic);
      await importWarpSyncBeforeSync(matic);
      expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "unsupported",
      );
      await startWarpSync(matic);
      expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("says so when the chain has no snapshot", async () => {
    vi.mocked(fetchWarpSyncManifest).mockResolvedValueOnce(undefined);
    await startWarpSync(matic);
    expect(importWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "none",
    );
  });

  test("logs a failure and says so", async () => {
    const error = new Error("network");
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(fetchWarpSyncManifest).mockRejectedValueOnce(error);
    await startWarpSync(matic);
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "failed",
    );
    expect(customLogger.error).toHaveBeenCalledWith(
      "Import the warp sync snapshot.",
      { chainName: "matic", errorObject: error },
    );
  });

  test("imports while holding the sync lock of the chain", async () => {
    let lockName: string | undefined;
    vi.mocked(importWarpSync).mockImplementationOnce(async () => {
      lockName = (await lockManager.query()).held?.[0]?.name;
      return 30_000_000;
    });
    await startWarpSync(matic);
    expect(lockName).toBe(getSyncLockName("matic"));
  });

  test("skips it while another tab holds the lock, and tries again next time", async () => {
    vi.spyOn(customLogger, "info").mockImplementation(() => {});
    let release: () => void = () => {};
    void lockManager.request(
      getSyncLockName("matic"),
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
    await startWarpSync(matic);
    expect(importWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "idle",
    );
    // The stores are read again when the other tab releases the lock.
    expect(waitForSyncLockRelease).toHaveBeenCalledExactlyOnceWith("matic");

    release();
    await startWarpSync(matic);
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("reads the DB into the stores after it, while it holds the lock", async () => {
    let held: boolean | undefined;
    vi.mocked(reloadSyncStatusInChain).mockImplementationOnce(async () => {
      held = (await lockManager.query()).held?.length === 1;
    });
    await startWarpSync(matic);
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("matic");
    expect(held).toBe(true);
  });

  test("works without Web Locks (insecure context)", async () => {
    removeLockManager();
    await startWarpSync(matic);
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("does not import without Web Locks while this tab syncs the chain", async () => {
    removeLockManager();
    vi.mocked(isSyncedByThisTab).mockReturnValueOnce(true);
    await startWarpSync(matic);
    expect(importWarpSync).not.toHaveBeenCalled();
  });

  test("lets the sync wait for the import of this tab", async () => {
    let finish: (value: number) => void = () => {};
    vi.mocked(importWarpSync).mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );
    void startWarpSync(matic);
    let waited = false;
    const waiting = waitForWarpSync("matic").then(() => (waited = true));
    await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
    expect(waited).toBe(false);
    finish(30_000_000);
    await waiting;
    expect(waited).toBe(true);
  });

  describe("importWarpSyncBeforeSync", () => {
    test("imports what is not imported yet", async () => {
      await importWarpSyncBeforeSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });
    test("does nothing once imported, or when it is off", async () => {
      await importWarpSyncBeforeSync(matic);
      await importWarpSyncBeforeSync(matic);
      setWarpSyncState("matic", { status: "idle" });
      setWarpSync("matic", false);
      await importWarpSyncBeforeSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });
    test("does not throw when the import fails: the sync goes on", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("db"));
      await expect(importWarpSyncBeforeSync(matic)).resolves.toBeUndefined();
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "failed",
      );
    });
  });

  describe("a large import", () => {
    beforeEach(() => {
      vi.mocked(getWarpSyncPending).mockResolvedValue(large);
    });

    test("waits for the user, and does not ask twice", async () => {
      await startWarpSync(matic);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toEqual({
        status: "confirm",
        toBlock: 30_000_000,
        createdAt: "2026-09-28T00:00:00.000Z",
        pending: large,
      });
      await startWarpSync(matic);
      expect(fetchWarpSyncManifest).toHaveBeenCalledTimes(1);
    });

    test("imports once confirmed, with the progress, and asks for persistent storage", async () => {
      const persist = vi.fn(async () => true);
      vi.stubGlobal("navigator", { ...navigator, storage: { persist } });
      try {
        let states: string[] = [];
        const unsubscribe = storeWarpSync.subscribe((all) =>
          states.push(
            `${all.matic?.status}:${all.matic?.progress?.doneLogCount ?? "-"}`,
          ),
        );
        vi.mocked(importWarpSync).mockImplementationOnce(
          async (_chain, _manifest, options) => {
            options?.onRangeDone?.({ logCount: 20_000 } as never);
            return 30_000_000;
          },
        );
        await startWarpSync(matic);
        states = [];
        await confirmWarpSync(matic);
        unsubscribe();
        expect(importWarpSync).toHaveBeenCalledTimes(1);
        expect(states).toContain("importing:0");
        expect(states).toContain("importing:20000");
        expect(states.at(-1)).toBe("imported:-");
        expect(persist).toHaveBeenCalledTimes(1);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    test("is not asked again in the tab after Not now, until Import", async () => {
      await startWarpSync(matic);
      declineWarpSync("matic");
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "declined",
      );
      setWarpSyncState("matic", { status: "idle" });
      await startWarpSync(matic);
      await importWarpSyncBeforeSync(matic);
      expect(fetchWarpSyncManifest).toHaveBeenCalledTimes(1);
      await confirmWarpSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("is skipped before the sync without asking, until confirmed", async () => {
      setWarpSyncState("matic", { status: "idle" });
      await importWarpSyncBeforeSync(matic);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "idle",
      );
      await startWarpSync(matic);
      await confirmWarpSync(matic);
      setWarpSyncState("matic", { status: "idle" });
      await importWarpSyncBeforeSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(2);
    });

    test("stops when the user stops it, and says what is left", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockImplementationOnce(
        (_chain, _manifest, options) =>
          new Promise((_, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(options.signal!.reason),
            ),
          ),
      );
      await startWarpSync(matic);
      const importing = confirmWarpSync(matic);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      const left: WarpSyncPending = { ...large, logCount: 1_000_000 };
      vi.mocked(getWarpSyncPending).mockResolvedValueOnce(left);
      stopWarpSync("matic");
      await importing;
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject({
        status: "stopped",
        pending: left,
      });
      // A file may have been saved after the stop: the stores follow the DB.
      expect(reloadSyncStatusInChain).toHaveBeenCalledWith("matic");
      // Not again in this tab until Import.
      setWarpSyncState("matic", { status: "idle" });
      await startWarpSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("is asked again after a reset forgets the confirmation", async () => {
      await startWarpSync(matic);
      await confirmWarpSync(matic);
      forgetWarpSyncConfirmation("matic");
      setWarpSyncState("matic", { status: "idle" });
      await startWarpSync(matic);
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "confirm",
      );
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("says so when Import cannot take the lock, and keeps Import", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      await startWarpSync(matic);
      declineWarpSync("matic");
      let release: () => void = () => {};
      void lockManager.request(
        getSyncLockName("matic"),
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
      await confirmWarpSync(matic);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject({
        status: "declined",
        busy: true,
        pending: large,
      });
      // Still held: not imported when the chain is opened again.
      release();
      await startWarpSync(matic);
      expect(importWarpSync).not.toHaveBeenCalled();
      await confirmWarpSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
      expect(selectWarpSyncState(get(storeWarpSync), "matic").busy).toBe(
        undefined,
      );
    });

    test("stops before it imports when it is turned off meanwhile", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      await startWarpSync(matic);
      let give: (value: WarpSyncManifest) => void = () => {};
      vi.mocked(fetchWarpSyncManifest).mockReturnValueOnce(
        new Promise((resolve) => (give = resolve)),
      );
      const importing = confirmWarpSync(matic);
      await vi.waitFor(() => expect(fetchWarpSyncManifest).toHaveBeenCalled());
      stopWarpSync("matic");
      give(manifest);
      await importing;
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "stopped",
      );
    });

    test("leaves importing even when what is left cannot be counted after a stop", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockImplementationOnce(
        (_chain, _manifest, options) =>
          new Promise((_, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(options.signal!.reason),
            ),
          ),
      );
      await startWarpSync(matic);
      const importing = confirmWarpSync(matic);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      vi.mocked(getWarpSyncPending).mockRejectedValueOnce(new Error("db"));
      stopWarpSync("matic");
      await importing;
      const state = selectWarpSyncState(get(storeWarpSync), "matic");
      expect(state.status).toBe("stopped");
      expect(state.pending).toBeUndefined();
    });
  });

  test("shows no progress for a small import", async () => {
    const progress: unknown[] = [];
    const unsubscribe = storeWarpSync.subscribe((all) =>
      progress.push(all.matic?.progress),
    );
    await startWarpSync(matic);
    unsubscribe();
    expect(progress.every((value) => value === undefined)).toBe(true);
  });
});
