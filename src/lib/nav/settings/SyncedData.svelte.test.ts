import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { get, type Writable } from "svelte/store";
import { storeSyncLockedByOtherTab } from "@eventLogs/syncLock";
import { resetSyncedData } from "@eventLogs/syncReset";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { setWarpSyncState } from "@warpSync/warpSyncState";
import SyncedData from "./SyncedData.svelte";

// The real stores and chain data load ethers, which does not load in the
// client project.
vi.mock("@stores/storeUserSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "matic" }) };
});
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({ matic: { warpSync: true } }) };
});
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
    fullName: "Polygon Mainnet",
  }),
}));
vi.mock("@eventLogs/syncLock", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncLockedByOtherTab: writable({ matic: false }) };
});
// The fly transition of the snackbar in the dialog is canceled when the test
// ends, which the browser reports as an error.
vi.mock("svelte/transition", () => ({ fly: () => ({}) }));
vi.mock("@eventLogs/syncReset", () => ({
  resetSyncedData: vi.fn(async () => "reset"),
}));

const syncStatus = storeSyncStatus as unknown as Writable<unknown>;
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
// The button in the dialog, not the one that opens it.
function confirmButton(container: HTMLElement): HTMLButtonElement {
  return [...dialog(container).querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Reset",
  )!;
}

describe("SyncedData.svelte", () => {
  afterEach(() => {
    storeSyncLockedByOtherTab.set({ matic: false });
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
    setChain("syncing", 0);
    render(SyncedData);
    expect(resetButton().disabled).toBe(true);

    setChain("stopped", 0);
    storeSyncLockedByOtherTab.set({ matic: true });
    await tick();
    expect(resetButton().disabled).toBe(true);

    storeSyncLockedByOtherTab.set({ matic: false });
    setWarpSyncState("matic", { status: "importing" });
    await tick();
    expect(resetButton().disabled).toBe(true);

    setWarpSyncState("matic", { status: "imported" });
    await tick();
    expect(resetButton().disabled).toBe(false);
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

  test("resets the chain and tells the result", async () => {
    setChain("stopped", 1234);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));

    await vi.waitFor(() => expect(dialog(container).open).toBe(false));
    expect(resetSyncedData).toHaveBeenCalledExactlyOnceWith({
      name: "matic",
      fullName: "Polygon Mainnet",
    });
    expect(get(storeNoDbSnackBar).text).toBe(
      "The sync of Polygon Mainnet was reset.",
    );
  });

  test("tells when the chain was synced at the time", async () => {
    vi.mocked(resetSyncedData).mockResolvedValueOnce("busy");
    setChain("stopped", 0);
    const { container } = render(SyncedData);
    await fireEvent.click(resetButton());
    await fireEvent.click(confirmButton(container));

    await vi.waitFor(() =>
      expect(get(storeNoDbSnackBar).text).toBe(
        "The chain is synced now. Stop the sync first.",
      ),
    );
  });
});
