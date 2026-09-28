import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import type { Writable } from "svelte/store";
import { customLogger } from "@utils/logger";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { storeUserSettings } from "@stores/storeUserSettings";
import { startWarpSync } from "@warpSync/warpSync";
import { setWarpSyncState } from "@warpSync/warpSyncState";
import WarpSyncConfig from "./WarpSyncConfig.svelte";

// The real stores and chain data load ethers, which does not load in the
// client project.
vi.mock("@stores/storeUserSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "matic" }) };
});
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeRpcSettings: writable({
      eth: { warpSync: true },
      matic: { warpSync: true },
      other: { warpSync: true },
    }),
  };
});
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
  }),
}));
vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));
vi.mock("@warpSync/warpSync", () => ({
  startWarpSync: vi.fn(async () => {}),
  confirmWarpSync: vi.fn(async () => {}),
  forgetWarpSyncConfirmation: vi.fn(),
}));

const userSettings = storeUserSettings as unknown as Writable<{
  selectedChainName: string;
}>;
const checkbox = (): HTMLInputElement =>
  screen.getByRole("checkbox", { name: "Warp sync" });

describe("WarpSyncConfig.svelte", () => {
  afterEach(() => {
    userSettings.set({ selectedChainName: "matic" });
    setWarpSyncState("matic", { status: "idle" });
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test("is not shown for a chain without a snapshot", () => {
    // Every chain of the app has a snapshot now.
    userSettings.set({ selectedChainName: "other" });
    render(WarpSyncConfig);
    expect(screen.queryByRole("checkbox", { name: "Warp sync" })).toBeNull();
  });

  test("shows the setting and up to where the snapshot goes", async () => {
    render(WarpSyncConfig);
    expect(checkbox().checked).toBe(true);
    setWarpSyncState("matic", {
      status: "imported",
      toBlock: 83_000_000,
      createdAt: "2026-09-28T00:00:00.000Z",
    });
    await tick();
    expect(
      screen.getByText(/up to block 83,000,000 \(2026-09-28\)/),
    ).toBeTruthy();
  });

  // Without a color it took the black of <dialog>, which the dark theme hid.
  test("colors the helper text as the other texts of the settings", () => {
    render(WarpSyncConfig);
    const helper = screen.getByText(/^Imports the event logs/);
    expect(helper.classList).toContain(
      colorClasses[colorSettings.navSettings].text,
    );
  });

  test("saves it when it is turned off", async () => {
    render(WarpSyncConfig);
    checkbox().click();
    await vi.waitFor(() =>
      expect(updateDbItemRpcSettings).toHaveBeenCalledWith(
        "matic",
        "warpSync",
        false,
      ),
    );
    expect(startWarpSync).not.toHaveBeenCalled();
  });

  test("shows the saved value again when the save fails", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(updateDbItemRpcSettings).mockRejectedValueOnce(new Error("db"));
    render(WarpSyncConfig);
    checkbox().click();
    await vi.waitFor(() => expect(customLogger.error).toHaveBeenCalled());
    await tick();
    expect(checkbox().checked).toBe(true);
  });
});
