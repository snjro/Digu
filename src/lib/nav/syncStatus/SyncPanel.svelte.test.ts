import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import SyncPanelTestHost from "./SyncPanel.testHost.svelte";

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
vi.mock("#eventLogs/syncReset.js", () => ({ resetSyncedData: vi.fn() }));
vi.mock("#db/dbSettings.js", () => ({ updateDbItemRpcSettings: vi.fn() }));
vi.mock("#warpSync/warpSync.js", () => ({
  startWarpSync: vi.fn(async () => {}),
  confirmWarpSync: vi.fn(async () => {}),
  forgetWarpSyncConfirmation: vi.fn(),
}));
// The fly transition of the snackbar in the dialog of Reset.
vi.mock("svelte/transition", () => ({ fly: () => ({}) }));

const syncStatus = storeSyncStatus as unknown as Writable<unknown>;
const lockedByOtherTab = storeSyncLockedByOtherTab as unknown as Writable<
  Record<string, boolean>
>;
function setChain(syncStateText: string): void {
  syncStatus.set({ matic: { syncStateText, subSyncStatuses: {} } });
}

const trigger = (): HTMLButtonElement =>
  screen.getByRole("button", { name: "Open the panel" });
// Hidden while it is closed.
const panel = (): HTMLElement => document.getElementById("sync-panel")!;
const isOpen = (): boolean => !panel().classList.contains("hidden");
const status = (): HTMLElement =>
  panel().querySelector<HTMLElement>('[role="status"]')!;

async function openPanel(): Promise<void> {
  await fireEvent.click(trigger());
  await tick();
}

describe("SyncPanel.svelte", () => {
  beforeEach(() => {
    setChain("stopped");
  });
  afterEach(() => {
    lockedByOtherTab.set({ matic: false });
    storeSyncStoppedReason.clear("matic");
    vi.clearAllMocks();
  });

  test("opens as a region named by its heading, and moves the focus to the heading", async () => {
    render(SyncPanelTestHost);
    expect(isOpen()).toBe(false);

    await openPanel();
    expect(isOpen()).toBe(true);
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const region: HTMLElement = screen.getByRole("region", {
      name: "Sync of Polygon Mainnet",
    });
    expect(region).toBe(panel());
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Sync of Polygon Mainnet" }),
    );
    // The settings of the chain, from the old settings dialog.
    expect(screen.getByRole("checkbox", { name: "Warp sync" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Reset" })[0]).toBeTruthy();
  });

  test("closes with Escape and gives the focus back to the button", async () => {
    render(SyncPanelTestHost);
    await openPanel();

    await fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(isOpen()).toBe(false);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  test("stays open on a held Escape, or Escape in an IME", async () => {
    render(SyncPanelTestHost);
    await openPanel();

    await fireEvent.keyDown(document.activeElement!, {
      key: "Escape",
      repeat: true,
    });
    expect(isOpen()).toBe(true);
    await fireEvent.keyDown(document.activeElement!, {
      key: "Escape",
      isComposing: true,
    });
    expect(isOpen()).toBe(true);
  });

  test("leaves Escape to an open dialog", async () => {
    render(SyncPanelTestHost, { withDialog: true });
    await openPanel();

    await fireEvent.keyDown(document.body, { key: "Escape" });
    expect(isOpen()).toBe(true);
  });

  test("closes with a click outside, without moving the focus", async () => {
    render(SyncPanelTestHost);
    await openPanel();
    const elsewhere: HTMLElement = screen.getByRole("textbox", {
      name: "Elsewhere",
    });
    elsewhere.focus();

    await fireEvent.click(elsewhere);
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(elsewhere);
  });

  test("stays open after a click in it or in a dialog, and toggles with its button", async () => {
    render(SyncPanelTestHost, { withDialog: true });
    await openPanel();

    await fireEvent.click(screen.getByRole("checkbox", { name: "Warp sync" }));
    expect(isOpen()).toBe(true);
    await fireEvent.click(
      screen.getByRole("button", { name: "In the dialog" }),
    );
    expect(isOpen()).toBe(true);

    await fireEvent.click(trigger());
    expect(isOpen()).toBe(false);
  });

  // Like Import, which goes when it is pressed, and Reset in its dialog,
  // which Close takes the place of.
  test.each(["the panel", "a dialog"])(
    "stays open after a click on a button that goes on the click, in %s",
    async (where) => {
      render(SyncPanelTestHost, { withDialog: true });
      await openPanel();
      const parent: HTMLElement =
        where === "the panel" ? panel() : document.querySelector("dialog")!;
      const button: HTMLButtonElement = document.createElement("button");
      button.addEventListener("click", () => button.remove());
      parent.append(button);

      await fireEvent.click(button);
      expect(button.isConnected).toBe(false);
      expect(isOpen()).toBe(true);
    },
  );

  test("tells the state of the sync in one status", async () => {
    render(SyncPanelTestHost);
    await openPanel();
    expect(panel().querySelectorAll('[role="status"]')).toHaveLength(
      // The other one is in the closed dialog of Reset.
      2,
    );
    expect(status().textContent?.trim()).toBe("Stopped.");

    setChain("syncing");
    await tick();
    expect(status().textContent?.trim()).toBe("Syncing.");

    setChain("stopping");
    await tick();
    expect(status().textContent?.trim()).toBe("Stopping.");

    setChain("stopped");
    lockedByOtherTab.set({ matic: true });
    await tick();
    expect(status().textContent?.trim()).toBe("Syncing in another tab.");
  });

  test("tells why the sync stopped, only while it is stopped here", async () => {
    render(SyncPanelTestHost);
    await openPanel();
    storeSyncStoppedReason.record("matic", "RPC_ERRORS");
    await tick();
    expect(status().textContent?.trim()).toBe(
      "Sync stopped: RPC errors. Try another RPC.",
    );

    lockedByOtherTab.set({ matic: true });
    await tick();
    expect(status().textContent?.trim()).toBe("Syncing in another tab.");

    lockedByOtherTab.set({ matic: false });
    setChain("stopping");
    await tick();
    expect(status().textContent?.trim()).toBe("Stopping.");

    setChain("stopped");
    storeSyncStoppedReason.clear("matic");
    storeSyncStoppedReason.record("matic", "UNEXPECTED_ERROR");
    await tick();
    expect(status().textContent?.trim()).toBe(
      "Sync stopped: unexpected error.",
    );
  });
});
