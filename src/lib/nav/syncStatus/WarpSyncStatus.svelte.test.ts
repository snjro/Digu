import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { retryWarpSync } from "#warpSync/warpSync.js";
import {
  setWarpSyncState,
  setWarpSyncStopController,
  storeWarpSync,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
import WarpSyncStatus from "./WarpSyncStatus.svelte";

// The chain data, the warp sync and the real store of the RPC settings load
// ethers, which does not load in the client project.
vi.mock("#stores/storeRpcSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeRpcSettings: writable({
      eth: { warpSync: true },
      matic: { warpSync: true },
    }),
  };
});
vi.mock("#utils/utilsDb.js", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
  }),
}));
vi.mock("#warpSync/warpSync.js", () => ({ retryWarpSync: vi.fn() }));

const rpcSettings = storeRpcSettings as unknown as Writable<
  Record<string, { warpSync: boolean }>
>;
function setWarpSyncOn(warpSync: boolean): void {
  rpcSettings.update((all) => ({ ...all, eth: { warpSync } }));
}

// The default chain of storeUserSettings is "eth".
const pending: WarpSyncState["pending"] = {
  logCount: 100,
  snapshotLogCount: 100,
  bytes: 1_000,
  rawBytes: 10_000,
  files: 1,
};

async function setState(state: WarpSyncState): Promise<void> {
  setWarpSyncState("eth", state);
  await tick();
}

describe("WarpSyncStatus.svelte", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    storeWarpSync.set({});
    setWarpSyncStopController("eth", undefined);
    setWarpSyncOn(true);
    vi.mocked(retryWarpSync).mockClear();
  });

  test("shows nothing while it is not importing", async () => {
    const { container } = render(WarpSyncStatus);
    for (const status of [
      "idle",
      "checking",
      "confirm",
      "declined",
      "imported",
      "stopped",
      "none",
      "unsupported",
    ] as const) {
      await setState({ status, pending });
      expect(container.textContent).toBe("");
    }
  });

  test("shows a small import without the Stop button", async () => {
    render(WarpSyncStatus);
    await setState({ status: "importing" });
    expect(screen.getByText("Importing logs")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });

  test("Stop stops a large import", async () => {
    const controller = new AbortController();
    setWarpSyncStopController("eth", controller);
    render(WarpSyncStatus);
    await setState({
      status: "importing",
      pending,
      progress: { doneLogCount: 0, startedAt: Date.now() },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(controller.signal.aborted).toBe(true);
  });

  test("updates the time left and stops the timer after the import", async () => {
    const timersBefore: number = vi.getTimerCount();
    render(WarpSyncStatus);
    await setState({
      status: "importing",
      pending,
      progress: { doneLogCount: 50, startedAt: Date.now() },
    });
    expect(screen.getByText("Importing logs 50%")).toBeTruthy();
    expect(vi.getTimerCount()).toBe(timersBefore + 1);
    vi.advanceTimersByTime(60_000);
    await tick();
    expect(screen.getByText("Importing logs 50% · 1 minute left")).toBeTruthy();
    await setState({ status: "imported", pending });
    expect(vi.getTimerCount()).toBe(timersBefore);
  });

  test("says that the import failed, and Retry imports again", async () => {
    render(WarpSyncStatus);
    await setState({ status: "failed" });
    expect(
      screen.getByText("Could not import the published logs."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryWarpSync).toHaveBeenCalledExactlyOnceWith({ name: "eth" });
  });

  test("says so when Retry could not start while the chain is synced", async () => {
    render(WarpSyncStatus);
    await setState({ status: "failed", busy: true });
    expect(
      screen.getByText("Could not import now: the chain is synced."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  test("leaves the failure once it imports again", async () => {
    const { container } = render(WarpSyncStatus);
    await setState({ status: "failed" });
    await setState({ status: "checking" });
    expect(container.textContent).toBe("");
    await setState({
      status: "importing",
      pending,
      progress: { doneLogCount: 0, startedAt: Date.now() },
    });
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
  });

  test("shows the state of the selected chain only", async () => {
    const { container } = render(WarpSyncStatus);
    setWarpSyncState("matic", { status: "failed" });
    await tick();
    expect(container.textContent).toBe("");
  });

  test("shows no failure while the warp sync is off", async () => {
    setWarpSyncOn(false);
    const { container } = render(WarpSyncStatus);
    await setState({ status: "failed" });
    expect(container.textContent).toBe("");
  });
});
