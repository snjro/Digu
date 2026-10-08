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
  retryWarpSync,
  startWarpSync,
  waitForWarpSync,
} from "./warpSync";
import { fetchWarpSyncManifest } from "./warpSyncFetch";
import { getWarpSyncPending, importWarpSync } from "./warpSyncImport";
import {
  reloadSyncStatusInChain,
  runWithSyncLock,
  storeSyncLockedByOtherTab,
  storeSyncLockedByThisTab,
} from "#eventLogs/syncLock.js";
import {
  selectWarpSyncState,
  setWarpSyncState,
  stopWarpSync,
  storeWarpSync,
  type WarpSyncPending,
  type WarpSyncState,
} from "./warpSyncState";
import type { WarpSyncManifest } from "./warpSyncTypes";

vi.mock("./warpSyncFetch", () => ({ fetchWarpSyncManifest: vi.fn() }));
vi.mock("./warpSyncImport", () => ({
  importWarpSync: vi.fn(),
  getWarpSyncPending: vi.fn(),
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
// The lock is real. Only what reads the DB is mocked.
vi.mock("#eventLogs/syncLock.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#eventLogs/syncLock.js")>()),
  reloadSyncStatusInChain: vi.fn(async () => {}),
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

// Holds the sync lock of matic in this tab, as its sync does, until the
// returned function is called. The lock must be free.
function holdSyncLockInThisTab(): () => Promise<void> {
  let finish: () => void = () => {};
  const holding: Promise<boolean> = runWithSyncLock(
    "matic",
    "sync",
    () => new Promise<void>((resolve) => (finish = resolve)),
  );
  return async () => {
    finish();
    expect(await holding).toBe(true);
  };
}

// Calls click() as soon as matic shows the status, as a click on the button
// shown in it, and resolves when click() does.
function clickWhenShown(
  status: WarpSyncState["status"],
  click: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined = undefined;
    let clicked: boolean = false;
    unsubscribe = storeWarpSync.subscribe((all) => {
      if (clicked || selectWarpSyncState(all, "matic").status !== status) {
        return;
      }
      clicked = true;
      unsubscribe?.();
      click().then(resolve, reject);
    });
    if (clicked) unsubscribe();
  });
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
    storeSyncLockedByOtherTab.update((state) => ({ ...state, matic: false }));
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

  // The statuses of matic while it runs, each once in a row.
  async function statusesOf(run: () => Promise<void>): Promise<string[]> {
    const statuses: string[] = [];
    const unsubscribe = storeWarpSync.subscribe((all) => {
      const status: string = selectWarpSyncState(all, "matic").status;
      if (statuses.at(-1) !== status) statuses.push(status);
    });
    try {
      await run();
    } finally {
      unsubscribe();
    }
    return statuses;
  }

  test("checks what is left first, then imports it", async () => {
    expect(await statusesOf(() => startWarpSync(matic))).toEqual([
      "idle",
      "checking",
      "importing",
      "imported",
    ]);
  });

  test("is not importing when no log is left, but still moves the blocks on", async () => {
    vi.mocked(getWarpSyncPending).mockResolvedValue({
      logCount: 0,
      snapshotLogCount: small.logCount,
      bytes: 0,
      rawBytes: 0,
      files: 0,
    });
    expect(await statusesOf(() => startWarpSync(matic))).toEqual([
      "idle",
      "checking",
      "imported",
    ]);
    expect(importWarpSync).toHaveBeenCalledTimes(1);
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
    let kind: string | undefined;
    vi.mocked(importWarpSync).mockImplementationOnce(async () => {
      lockName = (await lockManager.query()).held?.[0]?.name;
      kind = get(storeSyncLockedByThisTab).matic;
      return 30_000_000;
    });
    await startWarpSync(matic);
    expect(lockName).toBe(getSyncLockName("matic"));
    expect(kind).toBe("import");
    expect(get(storeSyncLockedByThisTab).matic).toBeUndefined();
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
    expect(get(storeSyncLockedByOtherTab).matic).toBe(true);

    release();
    await vi.waitFor(() =>
      expect(get(storeSyncLockedByOtherTab).matic).toBe(false),
    );
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
    const release = holdSyncLockInThisTab();
    await startWarpSync(matic);
    expect(importWarpSync).not.toHaveBeenCalled();
    await release();
  });

  test("does not take the lock of this tab's sync of the chain", async () => {
    const release = holdSyncLockInThisTab();
    const request = vi.spyOn(lockManager, "request");
    await startWarpSync(matic);
    expect(request).not.toHaveBeenCalled();
    expect(importWarpSync).not.toHaveBeenCalled();
    expect(get(storeSyncLockedByOtherTab).matic).toBe(false);
    expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
      "idle",
    );
    await release();
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

  // An import that waits to be stopped, and rejects with the reason.
  function importUntilStopped(): void {
    vi.mocked(importWarpSync).mockImplementationOnce(
      (_chain, _manifest, options) =>
        new Promise((_, reject) =>
          options?.signal?.addEventListener("abort", () =>
            reject(options.signal!.reason),
          ),
        ),
    );
  }

  // How the import ends in each end state. stop: what the user does while it
  // runs.
  const endings: {
    status: WarpSyncState["status"];
    prepare: () => Promise<void>;
    start: () => Promise<void>;
    stop?: () => Promise<void>;
  }[] = [
    {
      status: "imported",
      prepare: async () => {},
      start: () => startWarpSync(matic),
    },
    {
      status: "none",
      prepare: async () => {
        vi.mocked(fetchWarpSyncManifest).mockResolvedValueOnce(undefined);
      },
      start: () => startWarpSync(matic),
    },
    {
      status: "confirm",
      prepare: async () => {
        vi.mocked(getWarpSyncPending).mockResolvedValue(large);
      },
      start: () => startWarpSync(matic),
    },
    {
      status: "unsupported",
      prepare: async () => {
        vi.spyOn(customLogger, "info").mockImplementation(() => {});
        vi.stubGlobal("DecompressionStream", undefined);
      },
      start: () => startWarpSync(matic),
    },
    {
      status: "failed",
      prepare: async () => {
        vi.spyOn(customLogger, "error").mockImplementation(() => {});
        vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("timeout"));
      },
      start: () => startWarpSync(matic),
    },
    {
      status: "stopped",
      prepare: async () => {
        vi.spyOn(customLogger, "info").mockImplementation(() => {});
        vi.mocked(getWarpSyncPending).mockResolvedValue(large);
        await startWarpSync(matic);
        importUntilStopped();
      },
      start: () => confirmWarpSync(matic),
      stop: async () => {
        await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
        stopWarpSync("matic");
      },
    },
  ];

  // The sync status is read once in the lock: after the import, or in the
  // catch after a stop or a failure.
  test.each(endings)(
    "shows $status only once the import has released the lock",
    async ({ status, prepare, start, stop }) => {
      try {
        await prepare();
        const reload = vi.mocked(reloadSyncStatusInChain);
        const calls: number = reload.mock.calls.length;
        let release: () => void = () => {};
        reload.mockReturnValueOnce(
          new Promise<void>((resolve) => (release = resolve)),
        );
        // What the lock manager holds when the state is set.
        const held: Promise<LockManagerSnapshot>[] = [];
        const unsubscribe = storeWarpSync.subscribe((all) => {
          if (
            held.length ||
            selectWarpSyncState(all, "matic").status !== status
          ) {
            return;
          }
          held.push(lockManager.query());
        });
        const ending: Promise<void> = start();
        await stop?.();
        await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(calls + 1));
        expect(
          selectWarpSyncState(get(storeWarpSync), "matic").status,
        ).not.toBe(status);
        release();
        await ending;
        unsubscribe();
        expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
          status,
        );
        expect(held).toHaveLength(1);
        expect((await held[0]).held).toEqual([]);
        expect(reload).toHaveBeenCalledTimes(calls + 1);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

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
    test("reads nothing again on a stop right after checking", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      let give: (value: WarpSyncManifest) => void = () => {};
      vi.mocked(fetchWarpSyncManifest).mockReturnValueOnce(
        new Promise((resolve) => (give = resolve)),
      );
      vi.mocked(reloadSyncStatusInChain).mockClear();
      const importing = importWarpSyncBeforeSync(matic);
      await vi.waitFor(() => expect(fetchWarpSyncManifest).toHaveBeenCalled());
      stopWarpSync("matic");
      give(manifest);
      await importing;
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "stopped",
      );
      // Nothing was saved before the stop, so the DB need not be read again.
      expect(reloadSyncStatusInChain).not.toHaveBeenCalled();
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
      expect(await statusesOf(() => startWarpSync(matic))).toEqual([
        "idle",
        "checking",
        "confirm",
      ]);
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
      expect(await statusesOf(() => importWarpSyncBeforeSync(matic))).toEqual([
        "idle",
        "checking",
        "idle",
      ]);
      expect(importWarpSync).not.toHaveBeenCalled();
      await startWarpSync(matic);
      await confirmWarpSync(matic);
      setWarpSyncState("matic", { status: "idle" });
      await importWarpSyncBeforeSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(2);
    });

    test("stops when the user stops it, and says what is left", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      importUntilStopped();
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

    test("imports on Import as soon as it is shown after a stop", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      importUntilStopped();
      await startWarpSync(matic);
      const importing = confirmWarpSync(matic);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      // Import in the settings, shown in "stopped".
      const importingAgain = clickWhenShown("stopped", () =>
        confirmWarpSync(matic),
      );
      stopWarpSync("matic");
      await importing;
      await importingAgain;
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject({
        status: "imported",
      });
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

    test("says so when Import is chosen while this tab syncs the chain", async () => {
      await startWarpSync(matic);
      declineWarpSync("matic");
      const release = holdSyncLockInThisTab();
      // No request, so no wait for SYNC_LOCK_TIMEOUT_MS.
      const request = vi.spyOn(lockManager, "request");
      await confirmWarpSync(matic);
      expect(request).not.toHaveBeenCalled();
      expect(importWarpSync).not.toHaveBeenCalled();
      // Not read as another tab, which disables the sync toggle.
      expect(get(storeSyncLockedByOtherTab).matic).toBe(false);
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject({
        status: "declined",
        busy: true,
        pending: large,
      });
      await release();
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
      vi.mocked(getWarpSyncPending).mockClear();
      vi.mocked(reloadSyncStatusInChain).mockClear();
      stopWarpSync("matic");
      give(manifest);
      await importing;
      expect(importWarpSync).not.toHaveBeenCalled();
      // Nothing was saved: only the lock reads the DB, once.
      expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("matic");
      const state = selectWarpSyncState(get(storeWarpSync), "matic");
      expect(state.status).toBe("stopped");
      // Counted once, before the stop is seen, and kept for the stopped state.
      expect(getWarpSyncPending).toHaveBeenCalledOnce();
      expect(state.pending).toEqual(
        await vi.mocked(getWarpSyncPending).mock.results[0].value,
      );
    });

    test("leaves importing even when what is left cannot be counted after a stop", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      importUntilStopped();
      await startWarpSync(matic);
      const importing = confirmWarpSync(matic);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      vi.mocked(getWarpSyncPending).mockRejectedValueOnce(new Error("db"));
      vi.mocked(reloadSyncStatusInChain).mockClear();
      stopWarpSync("matic");
      await importing;
      const state = selectWarpSyncState(get(storeWarpSync), "matic");
      expect(state.status).toBe("stopped");
      expect(state.pending).toBeUndefined();
      // Once by the import, which a file may have been saved by; not again by
      // the lock.
      expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("matic");
    });

    // Resolves the next reload of the DB only when the returned function is
    // called, also before the reload starts.
    function holdNextReload(): () => void {
      let released: boolean = false;
      let finish: () => void = () => {};
      vi.mocked(reloadSyncStatusInChain)
        .mockClear()
        .mockImplementationOnce(() =>
          released
            ? Promise.resolve()
            : new Promise<void>((resolve) => (finish = resolve)),
        );
      return () => {
        released = true;
        finish();
      };
    }

    test("says it stops at once, even after a range done late, until it is stopped", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockImplementationOnce(
        (_chain, _manifest, options) =>
          new Promise((_, reject) =>
            options?.signal?.addEventListener("abort", () => {
              // A range saved after the stop, before its result came back.
              options.onRangeDone?.({ logCount: 20_000 } as never);
              reject(options.signal!.reason);
            }),
          ),
      );
      await startWarpSync(matic);
      const finishReload = holdNextReload();
      const importing = confirmWarpSync(matic);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      stopWarpSync("matic");
      const stopping = {
        status: "importing",
        progress: { doneLogCount: 20_000 },
        ending: "stopping",
      };
      try {
        expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject(
          stopping,
        );
        await vi.waitFor(() =>
          expect(reloadSyncStatusInChain).toHaveBeenCalled(),
        );
        expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject(
          stopping,
        );
      } finally {
        // The lock is released for the next tests.
        finishReload();
        await importing;
      }
      const state = selectWarpSyncState(get(storeWarpSync), "matic");
      expect(state.status).toBe("stopped");
      expect(state.ending).toBeUndefined();
      // Only the reload after the stop: the lock does not read the DB again.
      expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(1);
    });

    test("says it finishes while it reads the DB again, until it is imported", async () => {
      await startWarpSync(matic);
      const finishReload = holdNextReload();
      const importing = confirmWarpSync(matic);
      try {
        await vi.waitFor(() =>
          expect(reloadSyncStatusInChain).toHaveBeenCalled(),
        );
        const state = selectWarpSyncState(get(storeWarpSync), "matic");
        expect(state).toMatchObject({
          status: "importing",
          ending: "finishing",
        });
        expect(state.progress).toBeDefined();
      } finally {
        finishReload();
        await importing;
      }
      const end = selectWarpSyncState(get(storeWarpSync), "matic");
      expect(end.status).toBe("imported");
      expect(end.ending).toBeUndefined();
    });

    test("hides Stop once it failed, while it reads the DB again, and a stop then still ends it as failed", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockImplementationOnce(
        async (_chain, _manifest, options) => {
          options?.onRangeDone?.({ logCount: 20_000 } as never);
          throw new Error("timeout");
        },
      );
      await startWarpSync(matic);
      const finishReload = holdNextReload();
      const importing = confirmWarpSync(matic);
      const failing = {
        status: "importing",
        progress: { doneLogCount: 20_000 },
        ending: "failing",
      };
      try {
        await vi.waitFor(() =>
          expect(reloadSyncStatusInChain).toHaveBeenCalled(),
        );
        expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject(
          failing,
        );
        stopWarpSync("matic");
        expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject(
          failing,
        );
      } finally {
        finishReload();
        await importing;
      }
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toEqual({
        status: "failed",
      });
    });
  });

  describe("retryWarpSync", () => {
    test("imports again after a failure", async () => {
      setWarpSyncState("matic", { status: "failed" });
      expect(await statusesOf(() => retryWarpSync(matic))).toEqual([
        "failed",
        "idle",
        "checking",
        "importing",
        "imported",
      ]);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("asks first for a large import that was not confirmed", async () => {
      vi.mocked(getWarpSyncPending).mockResolvedValue(large);
      setWarpSyncState("matic", { status: "failed" });
      await retryWarpSync(matic);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "confirm",
      );
    });

    test("does not ask again for a large import that was confirmed", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(getWarpSyncPending).mockResolvedValue(large);
      vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("timeout"));
      await startWarpSync(matic);
      await confirmWarpSync(matic);
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "failed",
      );
      expect(await statusesOf(() => retryWarpSync(matic))).not.toContain(
        "confirm",
      );
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "imported",
      );
    });

    test("says so when this tab syncs the chain, and Retry works later", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      setWarpSyncState("matic", { status: "failed" });
      const release = holdSyncLockInThisTab();
      await retryWarpSync(matic);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toEqual({
        status: "failed",
        busy: true,
      });
      await release();
      await retryWarpSync(matic);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
      expect(selectWarpSyncState(get(storeWarpSync), "matic")).toMatchObject({
        status: "imported",
      });
      expect(selectWarpSyncState(get(storeWarpSync), "matic").busy).toBe(
        undefined,
      );
    });

    // A failed import that holds the lock in the reload in its catch, until
    // release() is called. It is not "failed" yet, so Retry is not shown.
    async function failAndHoldLock(): Promise<{
      failing: Promise<void>;
      release: () => void;
    }> {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("timeout"));
      let release: () => void = () => {};
      vi.mocked(reloadSyncStatusInChain).mockReturnValueOnce(
        new Promise<void>((resolve) => (release = resolve)),
      );
      const failing = startWarpSync(matic);
      await vi.waitFor(() =>
        expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(1),
      );
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "importing",
      );
      return { failing, release };
    }

    test("imports again on Retry as soon as the failure is shown", async () => {
      const { failing, release } = await failAndHoldLock();
      const retrying = clickWhenShown("failed", () => retryWarpSync(matic));
      release();
      await failing;
      await retrying;
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "imported",
      );
      // The reload in the catch of the failure, and the one after the retry.
      expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(2);
    });

    test("imports again when the retried import fails, while its reload holds the lock", async () => {
      const { failing, release } = await failAndHoldLock();
      // The retried import fails too, and the reload in its catch waits.
      vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("timeout"));
      let releaseRetried: () => void = () => {};
      vi.mocked(reloadSyncStatusInChain).mockReturnValueOnce(
        new Promise<void>((resolve) => (releaseRetried = resolve)),
      );
      const retried = clickWhenShown("failed", () => retryWarpSync(matic));
      release();
      await failing;
      await vi.waitFor(() =>
        expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(2),
      );
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      // Not "failed" while the retried import holds the lock.
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "importing",
      );
      const retriedAgain = clickWhenShown("failed", () => retryWarpSync(matic));
      releaseRetried();
      await retried;
      await retriedAgain;
      expect(importWarpSync).toHaveBeenCalledTimes(3);
      expect(selectWarpSyncState(get(storeWarpSync), "matic").status).toBe(
        "imported",
      );
      // One reload for each of the three imports.
      expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(3);
    });

    test("does nothing when it is off", async () => {
      setWarpSync("matic", false);
      setWarpSyncState("matic", { status: "failed" });
      await retryWarpSync(matic);
      expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
    });
  });

  test("shows no progress for a small import, nor that it finishes", async () => {
    const progress: unknown[] = [];
    const unsubscribe = storeWarpSync.subscribe((all) =>
      progress.push(all.matic?.progress, all.matic?.ending),
    );
    await startWarpSync(matic);
    unsubscribe();
    expect(progress.every((value) => value === undefined)).toBe(true);
  });
});
