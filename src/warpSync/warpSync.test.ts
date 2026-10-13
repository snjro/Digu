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
vi.mock("#db/dbEventLogsDataHandlersSyncStatusLoad.js", () => ({
  loadSyncStatusInChain: vi.fn(async () => {}),
}));
vi.mock("#db/dbChainStatusDataHandlers.js", () => ({
  getDbRecordChainStatus: vi.fn(async () => ({ latestBlockNumber: 0 })),
}));
// The lock is real. Only what reads the DB is mocked.
vi.mock("#eventLogs/syncLock.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#eventLogs/syncLock.js")>()),
  reloadSyncStatusInChain: vi.fn(async () => {}),
}));

const eth = { name: "eth" } as Chain;
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

// Holds the sync lock of eth in this tab, as its sync does, until the
// returned function is called. The lock must be free.
function holdSyncLockInThisTab(): () => Promise<void> {
  let finish: () => void = () => {};
  const holding: Promise<boolean> = runWithSyncLock(
    "eth",
    "sync",
    () => new Promise<void>((resolve) => (finish = resolve)),
  );
  return async () => {
    finish();
    expect(await holding).toBe(true);
  };
}

// Calls click() as soon as eth shows the status, as a click on the button
// shown in it, and resolves when click() does.
function clickWhenShown(
  status: WarpSyncState["status"],
  click: () => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined = undefined;
    let clicked: boolean = false;
    unsubscribe = storeWarpSync.subscribe((all) => {
      if (clicked || selectWarpSyncState(all, "eth").status !== status) {
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
    setWarpSyncState("eth", { status: "idle" });
    setWarpSync("eth", true);
    vi.mocked(fetchWarpSyncManifest).mockReset().mockResolvedValue(manifest);
    vi.mocked(importWarpSync).mockReset().mockResolvedValue(30_000_000);
    vi.mocked(getWarpSyncPending).mockReset().mockResolvedValue(small);
    forgetWarpSyncConfirmation("eth");
    vi.mocked(reloadSyncStatusInChain).mockClear();
    storeSyncLockedByOtherTab.update((state) => ({ ...state, eth: false }));
  });
  afterEach(() => {
    removeLockManager();
    storeRpcSettings.updateState("eth", {
      warpSync: initialDataRpcSetting({ name: "eth" } as Chain).warpSync,
    });
    vi.restoreAllMocks();
  });

  test("imports the snapshot of the chain, and then says up to where", async () => {
    await startWarpSync(eth);
    expect(importWarpSync).toHaveBeenCalledExactlyOnceWith(
      eth,
      manifest,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(selectWarpSyncState(get(storeWarpSync), "eth")).toEqual({
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
    const importing = startWarpSync(eth);
    await vi.waitFor(() =>
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "importing",
      ),
    );
    finish(30_000_000);
    await importing;
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
      "imported",
    );
  });

  // The statuses of eth while it runs, each once in a row.
  async function statusesOf(run: () => Promise<void>): Promise<string[]> {
    const statuses: string[] = [];
    const unsubscribe = storeWarpSync.subscribe((all) => {
      const status: string = selectWarpSyncState(all, "eth").status;
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
    expect(await statusesOf(() => startWarpSync(eth))).toEqual([
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
    expect(await statusesOf(() => startWarpSync(eth))).toEqual([
      "idle",
      "checking",
      "imported",
    ]);
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("imports once: again only after a failure", async () => {
    await startWarpSync(eth);
    await startWarpSync(eth);
    expect(importWarpSync).toHaveBeenCalledTimes(1);

    setWarpSyncState("eth", { status: "failed" });
    await startWarpSync(eth);
    expect(importWarpSync).toHaveBeenCalledTimes(2);
  });

  test("shares the running import", async () => {
    const first = startWarpSync(eth);
    const second = startWarpSync(eth);
    expect(second).toBe(first);
    await first;
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("does nothing when it is off, or for a chain without a snapshot", async () => {
    setWarpSync("eth", false);
    await startWarpSync(eth);
    // Every chain of the app has a snapshot now.
    await startWarpSync({ name: "other" } as unknown as Chain);
    expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
  });

  test("fetches nothing without DecompressionStream, says so, and does not try again", async () => {
    vi.stubGlobal("DecompressionStream", undefined);
    try {
      await startWarpSync(eth);
      await importWarpSyncBeforeSync(eth);
      expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "unsupported",
      );
      await startWarpSync(eth);
      expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("says so when the chain has no snapshot", async () => {
    vi.mocked(fetchWarpSyncManifest).mockResolvedValueOnce(undefined);
    await startWarpSync(eth);
    expect(importWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe("none");
  });

  test("logs a failure and says so", async () => {
    const error = new Error("network");
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(fetchWarpSyncManifest).mockRejectedValueOnce(error);
    await startWarpSync(eth);
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
      "failed",
    );
    expect(customLogger.error).toHaveBeenCalledWith(
      "Import the warp sync snapshot.",
      { chainName: "eth", errorObject: error },
    );
  });

  test("imports while holding the sync lock of the chain", async () => {
    let lockName: string | undefined;
    let kind: string | undefined;
    vi.mocked(importWarpSync).mockImplementationOnce(async () => {
      lockName = (await lockManager.query()).held?.[0]?.name;
      kind = get(storeSyncLockedByThisTab).eth;
      return 30_000_000;
    });
    await startWarpSync(eth);
    expect(lockName).toBe(getSyncLockName("eth"));
    expect(kind).toBe("import");
    expect(get(storeSyncLockedByThisTab).eth).toBeUndefined();
  });

  test("skips it while another tab holds the lock, and tries again next time", async () => {
    vi.spyOn(customLogger, "info").mockImplementation(() => {});
    let release: () => void = () => {};
    void lockManager.request(
      getSyncLockName("eth"),
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
    await startWarpSync(eth);
    expect(importWarpSync).not.toHaveBeenCalled();
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe("idle");
    // The stores are read again when the other tab releases the lock.
    expect(get(storeSyncLockedByOtherTab).eth).toBe(true);

    release();
    await vi.waitFor(() =>
      expect(get(storeSyncLockedByOtherTab).eth).toBe(false),
    );
    await startWarpSync(eth);
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("reads the DB into the stores after it, while it holds the lock", async () => {
    let held: boolean | undefined;
    vi.mocked(reloadSyncStatusInChain).mockImplementationOnce(async () => {
      held = (await lockManager.query()).held?.length === 1;
    });
    await startWarpSync(eth);
    expect(reloadSyncStatusInChain).toHaveBeenCalledExactlyOnceWith("eth");
    expect(held).toBe(true);
  });

  test("works without Web Locks (insecure context)", async () => {
    removeLockManager();
    await startWarpSync(eth);
    expect(importWarpSync).toHaveBeenCalledTimes(1);
  });

  test("does not import without Web Locks while this tab syncs the chain", async () => {
    removeLockManager();
    const release = holdSyncLockInThisTab();
    await startWarpSync(eth);
    expect(importWarpSync).not.toHaveBeenCalled();
    await release();
  });

  test("does not take the lock of this tab's sync of the chain", async () => {
    const release = holdSyncLockInThisTab();
    const request = vi.spyOn(lockManager, "request");
    await startWarpSync(eth);
    expect(request).not.toHaveBeenCalled();
    expect(importWarpSync).not.toHaveBeenCalled();
    expect(get(storeSyncLockedByOtherTab).eth).toBe(false);
    expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe("idle");
    await release();
  });

  test("lets the sync wait for the import of this tab", async () => {
    let finish: (value: number) => void = () => {};
    vi.mocked(importWarpSync).mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );
    void startWarpSync(eth);
    let waited = false;
    const waiting = waitForWarpSync("eth").then(() => (waited = true));
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
      start: () => startWarpSync(eth),
    },
    {
      status: "none",
      prepare: async () => {
        vi.mocked(fetchWarpSyncManifest).mockResolvedValueOnce(undefined);
      },
      start: () => startWarpSync(eth),
    },
    {
      status: "confirm",
      prepare: async () => {
        vi.mocked(getWarpSyncPending).mockResolvedValue(large);
      },
      start: () => startWarpSync(eth),
    },
    {
      status: "unsupported",
      prepare: async () => {
        vi.spyOn(customLogger, "info").mockImplementation(() => {});
        vi.stubGlobal("DecompressionStream", undefined);
      },
      start: () => startWarpSync(eth),
    },
    {
      status: "failed",
      prepare: async () => {
        vi.spyOn(customLogger, "error").mockImplementation(() => {});
        vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("timeout"));
      },
      start: () => startWarpSync(eth),
    },
    {
      status: "stopped",
      prepare: async () => {
        vi.spyOn(customLogger, "info").mockImplementation(() => {});
        vi.mocked(getWarpSyncPending).mockResolvedValue(large);
        await startWarpSync(eth);
        importUntilStopped();
      },
      start: () => confirmWarpSync(eth),
      stop: async () => {
        await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
        stopWarpSync("eth");
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
            selectWarpSyncState(all, "eth").status !== status
          ) {
            return;
          }
          held.push(lockManager.query());
        });
        const ending: Promise<void> = start();
        await stop?.();
        await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(calls + 1));
        expect(selectWarpSyncState(get(storeWarpSync), "eth").status).not.toBe(
          status,
        );
        release();
        await ending;
        unsubscribe();
        expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
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
      await importWarpSyncBeforeSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });
    test("does nothing once imported, or when it is off", async () => {
      await importWarpSyncBeforeSync(eth);
      await importWarpSyncBeforeSync(eth);
      setWarpSyncState("eth", { status: "idle" });
      setWarpSync("eth", false);
      await importWarpSyncBeforeSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });
    test("does not throw when the import fails: the sync goes on", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("db"));
      await expect(importWarpSyncBeforeSync(eth)).resolves.toBeUndefined();
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "failed",
      );
    });
  });

  describe("a large import", () => {
    beforeEach(() => {
      vi.mocked(getWarpSyncPending).mockResolvedValue(large);
    });

    test("waits for the user, and does not ask twice", async () => {
      expect(await statusesOf(() => startWarpSync(eth))).toEqual([
        "idle",
        "checking",
        "confirm",
      ]);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toEqual({
        status: "confirm",
        toBlock: 30_000_000,
        createdAt: "2026-09-28T00:00:00.000Z",
        pending: large,
      });
      await startWarpSync(eth);
      expect(fetchWarpSyncManifest).toHaveBeenCalledTimes(1);
    });

    test("imports once confirmed, with the progress, and asks for persistent storage", async () => {
      const persist = vi.fn(async () => true);
      vi.stubGlobal("navigator", { ...navigator, storage: { persist } });
      try {
        let states: string[] = [];
        const unsubscribe = storeWarpSync.subscribe((all) =>
          states.push(
            `${all.eth?.status}:${all.eth?.progress?.doneLogCount ?? "-"}`,
          ),
        );
        vi.mocked(importWarpSync).mockImplementationOnce(
          async (_chain, _manifest, options) => {
            options?.onRangeDone?.({ logCount: 20_000 } as never);
            return 30_000_000;
          },
        );
        await startWarpSync(eth);
        states = [];
        await confirmWarpSync(eth);
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
      await startWarpSync(eth);
      declineWarpSync("eth");
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "declined",
      );
      setWarpSyncState("eth", { status: "idle" });
      await startWarpSync(eth);
      await importWarpSyncBeforeSync(eth);
      expect(fetchWarpSyncManifest).toHaveBeenCalledTimes(1);
      await confirmWarpSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("is skipped before the sync without asking, until confirmed", async () => {
      setWarpSyncState("eth", { status: "idle" });
      expect(await statusesOf(() => importWarpSyncBeforeSync(eth))).toEqual([
        "idle",
        "checking",
        "idle",
      ]);
      expect(importWarpSync).not.toHaveBeenCalled();
      await startWarpSync(eth);
      await confirmWarpSync(eth);
      setWarpSyncState("eth", { status: "idle" });
      await importWarpSyncBeforeSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(2);
    });

    test("stops when the user stops it, and says what is left", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      importUntilStopped();
      await startWarpSync(eth);
      const importing = confirmWarpSync(eth);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      const left: WarpSyncPending = { ...large, logCount: 1_000_000 };
      vi.mocked(getWarpSyncPending).mockResolvedValueOnce(left);
      stopWarpSync("eth");
      await importing;
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject({
        status: "stopped",
        pending: left,
      });
      // A file may have been saved after the stop: the stores follow the DB.
      expect(reloadSyncStatusInChain).toHaveBeenCalledWith("eth");
      // Not again in this tab until Import.
      setWarpSyncState("eth", { status: "idle" });
      await startWarpSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("imports on Import as soon as it is shown after a stop", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      importUntilStopped();
      await startWarpSync(eth);
      const importing = confirmWarpSync(eth);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      // Import in the settings, shown in "stopped".
      const importingAgain = clickWhenShown("stopped", () =>
        confirmWarpSync(eth),
      );
      stopWarpSync("eth");
      await importing;
      await importingAgain;
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject({
        status: "imported",
      });
    });

    test("is asked again after a reset forgets the confirmation", async () => {
      await startWarpSync(eth);
      await confirmWarpSync(eth);
      forgetWarpSyncConfirmation("eth");
      setWarpSyncState("eth", { status: "idle" });
      await startWarpSync(eth);
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "confirm",
      );
      expect(importWarpSync).toHaveBeenCalledTimes(1);
    });

    test("says so when Import cannot take the lock, and keeps Import", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      await startWarpSync(eth);
      declineWarpSync("eth");
      let release: () => void = () => {};
      void lockManager.request(
        getSyncLockName("eth"),
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      // Waits SYNC_LOCK_TIMEOUT_MS (1 s), as the sync does.
      await confirmWarpSync(eth);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject({
        status: "declined",
        busy: true,
        pending: large,
      });
      // Still held: not imported when the chain is opened again.
      release();
      await startWarpSync(eth);
      expect(importWarpSync).not.toHaveBeenCalled();
      await confirmWarpSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
      expect(selectWarpSyncState(get(storeWarpSync), "eth").busy).toBe(
        undefined,
      );
    });

    test("says so when Import is chosen while this tab syncs the chain", async () => {
      await startWarpSync(eth);
      declineWarpSync("eth");
      const release = holdSyncLockInThisTab();
      // No request, so no wait for SYNC_LOCK_TIMEOUT_MS.
      const request = vi.spyOn(lockManager, "request");
      await confirmWarpSync(eth);
      expect(request).not.toHaveBeenCalled();
      expect(importWarpSync).not.toHaveBeenCalled();
      // Not read as another tab, which disables the sync toggle.
      expect(get(storeSyncLockedByOtherTab).eth).toBe(false);
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject({
        status: "declined",
        busy: true,
        pending: large,
      });
      await release();
    });

    test("stops before it imports when it is turned off meanwhile", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      await startWarpSync(eth);
      let give: (value: WarpSyncManifest) => void = () => {};
      vi.mocked(fetchWarpSyncManifest).mockReturnValueOnce(
        new Promise((resolve) => (give = resolve)),
      );
      const importing = confirmWarpSync(eth);
      await vi.waitFor(() => expect(fetchWarpSyncManifest).toHaveBeenCalled());
      stopWarpSync("eth");
      give(manifest);
      await importing;
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "stopped",
      );
    });

    test("leaves importing even when what is left cannot be counted after a stop", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      importUntilStopped();
      await startWarpSync(eth);
      const importing = confirmWarpSync(eth);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      vi.mocked(getWarpSyncPending).mockRejectedValueOnce(new Error("db"));
      stopWarpSync("eth");
      await importing;
      const state = selectWarpSyncState(get(storeWarpSync), "eth");
      expect(state.status).toBe("stopped");
      expect(state.pending).toBeUndefined();
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
      await startWarpSync(eth);
      const finishReload = holdNextReload();
      const importing = confirmWarpSync(eth);
      await vi.waitFor(() => expect(importWarpSync).toHaveBeenCalled());
      stopWarpSync("eth");
      const stopping = {
        status: "importing",
        progress: { doneLogCount: 20_000 },
        ending: "stopping",
      };
      try {
        expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject(
          stopping,
        );
        await vi.waitFor(() =>
          expect(reloadSyncStatusInChain).toHaveBeenCalled(),
        );
        expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject(
          stopping,
        );
      } finally {
        // The lock is released for the next tests.
        finishReload();
        await importing;
      }
      const state = selectWarpSyncState(get(storeWarpSync), "eth");
      expect(state.status).toBe("stopped");
      expect(state.ending).toBeUndefined();
      // Only the reload after the stop: the lock does not read the DB again.
      expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(1);
    });

    test("says it finishes while it reads the DB again, until it is imported", async () => {
      await startWarpSync(eth);
      const finishReload = holdNextReload();
      const importing = confirmWarpSync(eth);
      try {
        await vi.waitFor(() =>
          expect(reloadSyncStatusInChain).toHaveBeenCalled(),
        );
        const state = selectWarpSyncState(get(storeWarpSync), "eth");
        expect(state).toMatchObject({
          status: "importing",
          ending: "finishing",
        });
        expect(state.progress).toBeDefined();
      } finally {
        finishReload();
        await importing;
      }
      const end = selectWarpSyncState(get(storeWarpSync), "eth");
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
      await startWarpSync(eth);
      const finishReload = holdNextReload();
      const importing = confirmWarpSync(eth);
      const failing = {
        status: "importing",
        progress: { doneLogCount: 20_000 },
        ending: "failing",
      };
      try {
        await vi.waitFor(() =>
          expect(reloadSyncStatusInChain).toHaveBeenCalled(),
        );
        expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject(
          failing,
        );
        stopWarpSync("eth");
        expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject(
          failing,
        );
      } finally {
        finishReload();
        await importing;
      }
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toEqual({
        status: "failed",
      });
    });
  });

  describe("retryWarpSync", () => {
    test("imports again after a failure", async () => {
      setWarpSyncState("eth", { status: "failed" });
      expect(await statusesOf(() => retryWarpSync(eth))).toEqual([
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
      setWarpSyncState("eth", { status: "failed" });
      await retryWarpSync(eth);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "confirm",
      );
    });

    test("does not ask again for a large import that was confirmed", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      vi.mocked(getWarpSyncPending).mockResolvedValue(large);
      vi.mocked(importWarpSync).mockRejectedValueOnce(new Error("timeout"));
      await startWarpSync(eth);
      await confirmWarpSync(eth);
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "failed",
      );
      expect(await statusesOf(() => retryWarpSync(eth))).not.toContain(
        "confirm",
      );
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "imported",
      );
    });

    test("says so when this tab syncs the chain, and Retry works later", async () => {
      vi.spyOn(customLogger, "info").mockImplementation(() => {});
      setWarpSyncState("eth", { status: "failed" });
      const release = holdSyncLockInThisTab();
      await retryWarpSync(eth);
      expect(importWarpSync).not.toHaveBeenCalled();
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toEqual({
        status: "failed",
        busy: true,
      });
      await release();
      await retryWarpSync(eth);
      expect(importWarpSync).toHaveBeenCalledTimes(1);
      expect(selectWarpSyncState(get(storeWarpSync), "eth")).toMatchObject({
        status: "imported",
      });
      expect(selectWarpSyncState(get(storeWarpSync), "eth").busy).toBe(
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
      const failing = startWarpSync(eth);
      await vi.waitFor(() =>
        expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(1),
      );
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "importing",
      );
      return { failing, release };
    }

    test("imports again on Retry as soon as the failure is shown", async () => {
      const { failing, release } = await failAndHoldLock();
      const retrying = clickWhenShown("failed", () => retryWarpSync(eth));
      release();
      await failing;
      await retrying;
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
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
      const retried = clickWhenShown("failed", () => retryWarpSync(eth));
      release();
      await failing;
      await vi.waitFor(() =>
        expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(2),
      );
      expect(importWarpSync).toHaveBeenCalledTimes(2);
      // Not "failed" while the retried import holds the lock.
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "importing",
      );
      const retriedAgain = clickWhenShown("failed", () => retryWarpSync(eth));
      releaseRetried();
      await retried;
      await retriedAgain;
      expect(importWarpSync).toHaveBeenCalledTimes(3);
      expect(selectWarpSyncState(get(storeWarpSync), "eth").status).toBe(
        "imported",
      );
      // One reload for each of the three imports.
      expect(reloadSyncStatusInChain).toHaveBeenCalledTimes(3);
    });

    test("does nothing when it is off", async () => {
      setWarpSync("eth", false);
      setWarpSyncState("eth", { status: "failed" });
      await retryWarpSync(eth);
      expect(fetchWarpSyncManifest).not.toHaveBeenCalled();
    });
  });

  test("shows no progress for a small import, nor that it finishes", async () => {
    const progress: unknown[] = [];
    const unsubscribe = storeWarpSync.subscribe((all) =>
      progress.push(all.eth?.progress, all.eth?.ending),
    );
    await startWarpSync(eth);
    unsubscribe();
    expect(progress.every((value) => value === undefined)).toBe(true);
  });
});
