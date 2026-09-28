import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import SyncNotice from "./SyncNotice.svelte";

// The real stores build their state from the chain data, which loads ethers.
vi.mock("@stores/storeUserSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "eth" }) };
});
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({ eth: { syncStateText: "stopped" } }) };
});

const syncStatus = storeSyncStatus as unknown as Writable<
  Record<string, { syncStateText: string }>
>;

describe("SyncNotice.svelte", () => {
  test("shows the state of the sync of the selected chain in a status region", async () => {
    render(SyncNotice);
    const status = screen.getByRole("status");
    expect(status.textContent?.trim()).toBe("");
    // No box, so that the grid of the dialog adds no gap.
    expect(status.classList).toContain("contents");

    syncStatus.set({ eth: { syncStateText: "syncing" } });
    await tick();
    expect(status.textContent).toContain(
      "Syncing. Stop the sync to change these settings.",
    );
    expect(status.classList).not.toContain("contents");
    expect(
      screen.getByText("Syncing. Stop the sync to change these settings.")
        .classList,
    ).not.toContain("motion-safe:animate-pulse");

    syncStatus.set({ eth: { syncStateText: "stopping" } });
    await tick();
    expect(status.textContent).toContain(
      "Stopping the sync… The settings can be changed once it stops.",
    );
    // Something goes on: it pulses, unless the user reduces the motion.
    expect(
      screen.getByText(
        "Stopping the sync… The settings can be changed once it stops.",
      ).classList,
    ).toContain("motion-safe:animate-pulse");

    syncStatus.set({ eth: { syncStateText: "stopped" } });
    await tick();
    expect(status.textContent?.trim()).toBe("");
  });
});
