import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { initialDataUserSettings } from "#db/dbTypes.js";
import { updateWarpSync } from "#lib/nav/settings/warpSyncSetting.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";
import { confirmWarpSync, declineWarpSync } from "#warpSync/warpSync.js";
import {
  setWarpSyncState,
  storeWarpSync,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
import WarpSyncConfirmDialog from "./WarpSyncConfirmDialog.svelte";

// The chain data, the warp sync and the DB load ethers, which does not load
// in the client project.
vi.mock("#utils/utilsDb.js", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
    fullName: "Ethereum Mainnet",
  }),
}));
vi.mock("#warpSync/warpSync.js", () => ({
  confirmWarpSync: vi.fn(),
  declineWarpSync: vi.fn(),
}));
vi.mock("#lib/nav/settings/warpSyncSetting.js", () => ({
  updateWarpSync: vi.fn(async () => true),
}));

const targetChain = { name: "eth", fullName: "Ethereum Mainnet" };
const confirmState: WarpSyncState = {
  status: "confirm",
  toBlock: 26_000_000,
  createdAt: "2026-10-01T00:00:00.000Z",
  pending: {
    logCount: 2_000_000,
    snapshotLogCount: 2_000_000,
    bytes: 150_000_000,
    rawBytes: 1_500_000_000,
    files: 100,
  },
};

async function setState(state: WarpSyncState): Promise<void> {
  setWarpSyncState("eth", state);
  await tick();
}

function renderDialog(): HTMLDialogElement {
  const { container } = render(WarpSyncConfirmDialog);
  return container.querySelector("dialog")!;
}

async function renderAsking(): Promise<HTMLDialogElement> {
  const dialog = renderDialog();
  await setState(confirmState);
  expect(dialog.open).toBe(true);
  return dialog;
}

describe("WarpSyncConfirmDialog.svelte", () => {
  afterEach(() => {
    storeWarpSync.set({});
    storeUserSettings.set({ ...initialDataUserSettings });
    vi.clearAllMocks();
  });

  test("opens when the import waits for the user", async () => {
    const dialog = renderDialog();
    await setState({ status: "idle" });
    expect(dialog.open).toBe(false);
    await setState(confirmState);
    expect(dialog.open).toBe(true);
  });

  test("Import starts the import", async () => {
    const dialog = await renderAsking();
    await fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(confirmWarpSync).toHaveBeenCalledExactlyOnceWith(targetChain);
    expect(declineWarpSync).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  // Once: closing the dialog does not decline it again.
  test("Not now declines it once", async () => {
    const dialog = await renderAsking();
    await fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(declineWarpSync).toHaveBeenCalledExactlyOnceWith("eth");
    expect(confirmWarpSync).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  test("turning off the warp sync declines it and saves the setting", async () => {
    const dialog = await renderAsking();
    await fireEvent.click(
      screen.getByRole("button", {
        name: "Turn off warp sync for Ethereum Mainnet",
      }),
    );
    expect(declineWarpSync).toHaveBeenCalledExactlyOnceWith("eth");
    expect(updateWarpSync).toHaveBeenCalledExactlyOnceWith(targetChain, false);
    expect(confirmWarpSync).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  test("Escape is the same as Not now", async () => {
    const dialog = await renderAsking();
    await fireEvent(dialog, new Event("cancel"));
    expect(declineWarpSync).toHaveBeenCalledExactlyOnceWith("eth");
    expect(dialog.open).toBe(false);
  });

  test("the close button is the same as Not now", async () => {
    const dialog = await renderAsking();
    await fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(declineWarpSync).toHaveBeenCalledExactlyOnceWith("eth");
    expect(dialog.open).toBe(false);
  });

  test("closes without declining when the import starts", async () => {
    const dialog = await renderAsking();
    await setState({ ...confirmState, status: "importing" });
    expect(dialog.open).toBe(false);
    expect(declineWarpSync).not.toHaveBeenCalled();
  });

  // The answer of the last time does not stop Escape from declining it.
  test("declines it again when it asks again", async () => {
    const dialog = await renderAsking();
    await fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(declineWarpSync).toHaveBeenCalledOnce();
    // declineWarpSync is a mock, so the state is moved here.
    await setState({ ...confirmState, status: "declined" });
    await setState(confirmState);
    expect(dialog.open).toBe(true);
    await fireEvent(dialog, new Event("cancel"));
    expect(declineWarpSync).toHaveBeenCalledTimes(2);
    expect(dialog.open).toBe(false);
  });
});
