import { describe, expect, test } from "vitest";
import type { SyncStateText } from "#db/dbTypes.js";
import { NO_DATA } from "#utils/utilsConstants.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  setWarpSyncState,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
import { get } from "svelte/store";
import {
  getChainActivity,
  storeChainActivity,
  type ChainActivity,
  type ChainActivitySources,
} from "./chainActivity";
import { runWithSyncLock, storeSyncLockedByOtherTab } from "./syncLock";

const free: ChainActivitySources = {
  lockedByThisTab: undefined,
  lockedByOtherTab: false,
  syncStateText: "stopped",
  warpSyncState: { status: "idle" },
};
const largeImport: WarpSyncState = {
  status: "importing",
  progress: { doneLogCount: 0, startedAt: 0 },
};

describe("getChainActivity", () => {
  test("is free without a lock, whatever the detail says", () => {
    expect(getChainActivity(free)).toBe("free");
    // Left in the store, e.g. by a start that failed half way.
    expect(getChainActivity({ ...free, syncStateText: "syncing" })).toBe(
      "free",
    );
    // The end state is set only after the lock is released.
    expect(getChainActivity({ ...free, warpSyncState: largeImport })).toBe(
      "free",
    );
  });

  test.each<[SyncStateText, string]>([
    ["syncing", "syncing"],
    // While it starts and ends.
    ["stopped", "syncing"],
    [NO_DATA, "syncing"],
    ["stopping", "stopping"],
  ])("is the sync of this tab when %j", (syncStateText, activity) => {
    expect(
      getChainActivity({ ...free, lockedByThisTab: "sync", syncStateText }),
    ).toBe(activity);
  });

  test("is the import while the sync imports first, in its lock", () => {
    const syncing = { ...free, lockedByThisTab: "sync" } as const;
    expect(getChainActivity({ ...syncing, warpSyncState: largeImport })).toBe(
      "largeImport",
    );
    // As isWarpSyncRunning: "checking" is a part of the import.
    for (const status of ["checking", "importing"] as const) {
      expect(getChainActivity({ ...syncing, warpSyncState: { status } })).toBe(
        "smallImport",
      );
    }
    // The end states of an import are not.
    for (const status of [
      "idle",
      "imported",
      "none",
      "confirm",
      "declined",
      "stopped",
      "failed",
      "unsupported",
    ] as const) {
      expect(getChainActivity({ ...syncing, warpSyncState: { status } })).toBe(
        "syncing",
      );
    }
  });

  test("tells a large import, with its progress, from a small one", () => {
    const importing = { ...free, lockedByThisTab: "import" } as const;
    expect(getChainActivity({ ...importing, warpSyncState: largeImport })).toBe(
      "largeImport",
    );
    for (const warpSyncState of [
      { status: "checking" },
      { status: "importing" },
      { status: "idle" },
    ] as WarpSyncState[]) {
      expect(getChainActivity({ ...importing, warpSyncState })).toBe(
        "smallImport",
      );
    }
  });

  test("is resetting while this tab resets the chain", () => {
    expect(getChainActivity({ ...free, lockedByThisTab: "reset" })).toBe(
      "resetting",
    );
  });

  test("is another tab first: this tab only waits for the lock then", () => {
    for (const lockedByThisTab of [
      undefined,
      "sync",
      "import",
      "reset",
    ] as const) {
      expect(
        getChainActivity({
          ...free,
          lockedByThisTab,
          lockedByOtherTab: true,
          // Read from the DB at startup, while the other tab syncs.
          syncStateText: "syncing",
        }),
      ).toBe("otherTab");
    }
  });
});

describe("storeChainActivity", () => {
  test("follows the lock record of this tab and the lock of another tab", async () => {
    expect(get(storeChainActivity).matic).toBe("free");
    let finish: () => void = () => {};
    const holding: Promise<boolean> = runWithSyncLock(
      "matic",
      "reset",
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    expect(get(storeChainActivity).matic).toBe("resetting");
    // Another chain is not touched.
    expect(get(storeChainActivity).eth).toBe("free");
    storeSyncLockedByOtherTab.update((state) => ({ ...state, matic: true }));
    expect(get(storeChainActivity).matic).toBe("otherTab");
    storeSyncLockedByOtherTab.update((state) => ({ ...state, matic: false }));
    finish();
    expect(await holding).toBe(true);
    expect(get(storeChainActivity).matic).toBe("free");
  });

  test("tells the subscribers only when an activity changes", () => {
    const shown: Record<string, ChainActivity>[] = [];
    const unsubscribe = storeChainActivity.subscribe((activities) =>
      shown.push(activities),
    );
    expect(shown).toHaveLength(1);
    const first = shown[0];
    // As a sync saving a range, and other changes that keep the activities.
    storeSyncStatus.update((state) => structuredClone(state));
    storeSyncLockedByOtherTab.update((state) => ({ ...state }));
    setWarpSyncState("matic", { status: "imported" });
    expect(shown).toHaveLength(1);
    expect(get(storeChainActivity)).toBe(first);

    storeSyncLockedByOtherTab.update((state) => ({ ...state, matic: true }));
    expect(shown).toHaveLength(2);
    expect(shown[1].matic).toBe("otherTab");
    expect(shown[1].eth).toBe("free");
    storeSyncLockedByOtherTab.update((state) => ({ ...state, matic: false }));
    expect(shown).toHaveLength(3);
    unsubscribe();
    setWarpSyncState("matic", { status: "idle" });
  });
});
