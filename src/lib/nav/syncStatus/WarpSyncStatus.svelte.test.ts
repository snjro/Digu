import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import {
  setWarpSyncState,
  setWarpSyncStopController,
  storeWarpSync,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
import WarpSyncStatus from "./WarpSyncStatus.svelte";

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
  });

  test("shows nothing while it is not importing", async () => {
    const { container } = render(WarpSyncStatus);
    for (const status of ["idle", "confirm", "imported"] as const) {
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
});
