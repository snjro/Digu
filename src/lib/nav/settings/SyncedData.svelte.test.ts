import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { get, type Writable } from "svelte/store";
import {
  storeSyncLockedByOtherTab,
  storeSyncLockedByThisTab,
  type SyncLockKind,
} from "#eventLogs/syncLock.js";
import { resetSyncedData } from "#eventLogs/syncReset.js";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "#stores/storeNoDb.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { setWarpSyncState } from "#warpSync/warpSyncState.js";
import SyncedData from "./SyncedData.svelte";

// The real stores and chain data load ethers, which does not load in the
// client project.
vi.mock("#stores/storeUserSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "matic" }) };
});
vi.mock("#stores/storeRpcSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({ matic: { warpSync: true } }) };
});
vi.mock("#stores/storeSyncStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("#utils/utilsDb.js", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
    fullName: "Polygon Mainnet",
  }),
}));
vi.mock("#eventLogs/syncLock.js", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeSyncLockedByOtherTab: writable({ matic: false }),
    storeSyncLockedByThisTab: writable({}),
  };
});
// The fly transition of the snackbar in the dialog is canceled when the test
// ends, which the browser reports as an error.
vi.mock("svelte/transition", () => ({ fly: () => ({}) }));
vi.mock("#eventLogs/syncReset.js", () => ({
  resetSyncedData: vi.fn(async () => ({ result: "reset", deletedLogCount: 0 })),
}));

const syncStatus = storeSyncStatus as unknown as Writable<unknown>;
const lockedByThisTab = storeSyncLockedByThisTab as unknown as Writable<
  Record<string, SyncLockKind>
>;
function setChain(syncStateText: string, recordCount: number): void {
  syncStatus.set({
    matic: {
      syncStateText,
      subSyncStatuses: {
        p: {
          subSyncStatuses: {
            v: { subSyncStatuses: { A: { events: { E: { recordCount } } } } },
          },
        },
      },
    },
  });
}
// The first one opens the dialog.
const resetButton = (): HTMLButtonElement =>
  screen.getAllByRole<HTMLButtonElement>("button", {
    name: "Reset",
    hidden: true,
  })[0];
function dialog(container: HTMLElement): HTMLDialogElement {
  return container.querySelector("dialog")!;
}
// The button at the bottom, not the × of the header, which has the same name.
const closeButton = (): HTMLButtonElement =>
  screen
    .getAllByRole<HTMLButtonElement>("button", { name: "Close" })
    .find((button) => button.textContent?.trim() === "Close")!;
// The button in the dialog, not the one that opens it.
function confirmButton(container: HTMLElement): HTMLButtonElement {
  return [...dialog(container).querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Reset",
  )!;
}

describe("SyncedData.svelte", () => {
  afterEach(() => {
    storeSyncLockedByOtherTab.set({ matic: false });
    lockedByThisTab.set({});
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    setWarpSyncState("matic", { status: "idle" });
    vi.clearAllMocks();
  });

  test("shows the number of logs of the chain", () => {
    setChain("stopped", 1234);
    render(SyncedData);
    expect(screen.getByText("1,234 logs")).toBeTruthy();
    expect(resetButton().disabled).toBe(false);
  });

  test("cannot reset while the chain is synced here or in another tab, or imported", async () => {
    lockedByThisTab.set({ matic: "sync" });
    setChain("syncing", 0);
    render(SyncedData);
    expect(resetButton().disabled).toBe(true);
    // As text next to the button. It waits for the user: no pulse.
    expect(screen.getByText("Stop the sync first.").classList).not.toContain(
      "motion-safe:animate-pulse",
    );

    setChain("stopping", 0);
    await tick();
    expect(resetButton().disabled).toBe(true);
    // Something goes on: it pulses, unless the user reduces the motion.
    expect(screen.getByText("Wait until the sync stops.").classList).toContain(
      "motion-safe:animate-pulse",
    );
    expect(screen.queryByText("Stop the sync first.")).toBeNull();

    // While the sync ends: it still holds the lock.
    setChain("stopped", 0);
    await tick();
    expect(screen.getByText("Stop the sync first.")).toBeTruthy();

    lockedByThisTab.set({});
    storeSyncLockedByOtherTab.set({ matic: true });
    await tick();
    expect(resetButton().disabled).toBe(true);

    storeSyncLockedByOtherTab.set({ matic: false });
    // The import of the warp sync, or the one before the sync, in its lock.
    for (const kind of ["import", "sync"] as const) {
      lockedByThisTab.set({ matic: kind });
      for (const status of ["checking", "importing"] as const) {
        setWarpSyncState("matic", { status });
        await tick();
        expect(resetButton().disabled).toBe(true);
        expect(
          screen.getByText(
            "Wait until the logs published with this site are imported, or stop the import.",
          ),
        ).toBeTruthy();
      }
    }

    lockedByThisTab.set({});
    setWarpSyncState("matic", { status: "imported" });
    await tick();
    expect(resetButton().disabled).toBe(false);
    expect(screen.queryByText(/^Wait until|^Stop the sync/)).toBeNull();
  });

  test("says Resetting… only for the chain that this tab resets", async () => {
    setChain("stopped", 0);
    render(SyncedData);
    lockedByThisTab.set({ eth: "reset" });
    await tick();
    expect(resetButton().disabled).toBe(false);
    lockedByThisTab.set({ matic: "reset" });
    await tick();
    expect(resetButton().disabled).toBe(true);
    expect(screen.getByText("Resetting…")).toBeTruthy();
  });

  test("asks first, and deletes nothing when it is cancelled", async () => {
    setChain("stopped", 1234);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    expect(dialog(container).open).toBe(true);
    expect(screen.getByText("Reset the sync of Polygon Mainnet?")).toBeTruthy();
    expect(
      screen.getByText(/^This deletes the 1,234 event logs of Polygon Mainnet/),
    ).toBeTruthy();
    expect(
      screen.getByText(/^The logs published with this site are imported/),
    ).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(dialog(container).open).toBe(false);
    expect(resetSyncedData).not.toHaveBeenCalled();
  });

  test("shows the result in the dialog, and then the import of the warp sync", async () => {
    let finishImport: () => void = () => {};
    const warpSyncImport = new Promise<void>((resolve) => {
      finishImport = resolve;
    });
    vi.mocked(resetSyncedData).mockResolvedValueOnce({
      result: "reset",
      deletedLogCount: 1234,
      warpSyncImport,
    });
    setChain("stopped", 1234);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));

    expect(resetSyncedData).toHaveBeenCalledExactlyOnceWith({
      name: "matic",
      fullName: "Polygon Mainnet",
    });
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    await vi.waitFor(() =>
      expect(status.textContent).toContain(
        "Deleted 1,234 event logs of Polygon Mainnet.",
      ),
    );
    expect(status.textContent).toContain(
      "Importing the logs published with this site…",
    );
    expect(dialog(container).open).toBe(true);
    expect(screen.getByText("Reset the sync of Polygon Mainnet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    // The dialog shows it: no snackbar.
    expect(get(storeNoDbSnackBar).visible).toBe(false);

    setWarpSyncState("matic", { status: "imported", toBlock: 24_000_000 });
    setChain("stopped", 4064);
    finishImport();
    await vi.waitFor(() =>
      expect(status.textContent).toContain(
        "Imported 4,064 logs up to block 24,000,000.",
      ),
    );
    expect(status.textContent).not.toContain("Importing");

    await fireEvent.click(closeButton());
    expect(dialog(container).open).toBe(false);
    // Opened again, it asks first.
    await fireEvent.click(resetButton());
    expect(screen.getByText(/^This deletes the 4,064 event logs/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  test("says what comes next without the warp sync", async () => {
    vi.mocked(resetSyncedData).mockResolvedValueOnce({
      result: "reset",
      deletedLogCount: 7,
    });
    setChain("stopped", 7);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));

    const status = screen.getByRole("status");
    await vi.waitFor(() =>
      expect(status.textContent).toContain(
        "The next sync fetches every log again from your RPC.",
      ),
    );
  });

  test("can be closed while it resets, and the late result does not show up later", async () => {
    let finish: () => void = () => {};
    vi.mocked(resetSyncedData).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = () => resolve({ result: "reset", deletedLogCount: 7 });
      }),
    );
    setChain("stopped", 7);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));
    expect(screen.getByRole("status").textContent).toContain("Resetting…");

    await fireEvent.click(closeButton());
    expect(dialog(container).open).toBe(false);
    finish();
    await tick();
    await fireEvent.click(resetButton());
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  test("tells in the dialog, not in the snackbar, when the chain was synced at the time", async () => {
    vi.mocked(resetSyncedData).mockResolvedValueOnce({
      result: "busy",
      deletedLogCount: 0,
    });
    setChain("stopped", 0);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));

    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent?.trim()).toBe(
        "The chain is synced now, so nothing was deleted. Stop the sync first.",
      ),
    );
    expect(get(storeNoDbSnackBar).visible).toBe(false);
  });

  test("tells a failure in the snackbar when the dialog was closed first", async () => {
    let finish: () => void = () => {};
    vi.mocked(resetSyncedData).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = () => resolve({ result: "failed", deletedLogCount: 0 });
      }),
    );
    setChain("stopped", 0);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));
    await fireEvent.click(closeButton());
    finish();

    await vi.waitFor(() =>
      expect(get(storeNoDbSnackBar).text).toBe(
        "Reset failed. Some logs may be left. Try again.",
      ),
    );
  });
});
