import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "@constants/chains/types";
import { getSyncLockName } from "@db/constants";
import { initialDataRpcSetting } from "@db/dbTypes";
import { storeRpcSettings } from "@stores/storeRpcSettings";
import { customLogger } from "@utils/logger";
import { get } from "svelte/store";
import {
  installFakeLockManager,
  removeLockManager,
  type FakeLockManager,
} from "../testUtils/fakeLockManager";
import {
  importWarpSyncBeforeSync,
  startWarpSync,
  waitForWarpSync,
} from "./warpSync";
import { fetchWarpSyncManifest } from "./warpSyncFetch";
import { importWarpSync } from "./warpSyncImport";
import {
  isSyncedByThisTab,
  reloadSyncStatusInChain,
  waitForSyncLockRelease,
} from "@eventLogs/syncLock";
import {
  selectWarpSyncState,
  setWarpSyncState,
  storeWarpSync,
} from "./warpSyncState";
import type { WarpSyncManifest } from "./warpSyncTypes";

vi.mock("./warpSyncFetch", () => ({ fetchWarpSyncManifest: vi.fn() }));
vi.mock("./warpSyncImport", () => ({ importWarpSync: vi.fn() }));
vi.mock("@eventLogs/syncLock", () => ({
  isSyncedByThisTab: vi.fn(() => false),
  reloadSyncStatusInChain: vi.fn(async () => {}),
  waitForSyncLockRelease: vi.fn(),
}));

const matic = { name: "matic" } as Chain;
const eth = { name: "eth" } as Chain;
const manifest = {
  runs: [{ createdAt: "2026-09-28T00:00:00.000Z" }],
} as WarpSyncManifest;

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
    expect(importWarpSync).toHaveBeenCalledExactlyOnceWith(matic, manifest);
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
    await startWarpSync(eth);
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
});
