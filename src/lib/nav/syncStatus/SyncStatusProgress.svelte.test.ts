import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import SyncStatusProgress from "./SyncStatusProgress.svelte";
import type {
  ChainStatus,
  SyncStatusChain,
  SyncStatusesChain,
} from "@db/dbTypes";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { storeUserSettings } from "@stores/storeUserSettings";

// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("@stores/storeChainStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainStatus: writable({}) };
});
// BaseProgressCircle imports CommonChainExplorerLink, which loads the chain
// data too.
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({}) };
});
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
  }),
}));

const syncStatus = storeSyncStatus as unknown as Writable<SyncStatusesChain>;
const chainStatus = storeChainStatus as unknown as Writable<
  Record<string, ChainStatus>
>;

function initialState(): SyncStatusesChain {
  return {
    // The goal is the latest block number times numOfSyncTargetContract.
    eth: {
      creationBlockNumber: 0,
      fetchedBlockNumber: 100,
      numOfSyncTargetContract: 2,
      syncStateText: "stopped",
    },
    matic: {
      creationBlockNumber: 0,
      fetchedBlockNumber: 20,
      numOfSyncTargetContract: 1,
      syncStateText: "syncing",
    },
  } as unknown as SyncStatusesChain;
}
// Like storeSyncStatus.updateState, return a new state.
function setChain(chainName: string, value: Partial<SyncStatusChain>): void {
  syncStatus.update((state) => {
    const newState = structuredClone(state);
    Object.assign(newState[chainName], value);
    return newState;
  });
}
function setLatestBlockNumber(chainName: string, latestBlockNumber: number) {
  chainStatus.update((state) => ({
    ...state,
    [chainName]: { ...state[chainName], latestBlockNumber },
  }));
}
function renderProgress(hideProgressCircle: boolean) {
  return render(SyncStatusProgress, { hideProgressCircle });
}
// The progress rate and "%" are in separate labels.
function getLabel(text: string): HTMLElement {
  return screen.getByText(text, { selector: "label" });
}
function hasCircle(container: HTMLElement): boolean {
  return container.querySelector("svg circle") !== null;
}

describe("SyncStatusProgress.svelte", () => {
  beforeEach(() => {
    syncStatus.set(initialState());
    chainStatus.set({
      eth: { chainName: "eth", latestBlockNumber: 100 } as ChainStatus,
      matic: { chainName: "matic", latestBlockNumber: 100 } as ChainStatus,
    });
  });
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("shows the circle, the progress rate and the sync state text", () => {
    const { container } = renderProgress(false);
    expect(hasCircle(container)).toBe(true);
    expect(getLabel("50.0")).toBeTruthy();
    expect(getLabel("stopped").classList).toContain("text-xl");
  });

  test("shows the progress rate and the sync state text without the circle", () => {
    const { container } = renderProgress(true);
    expect(hasCircle(container)).toBe(false);
    expect(getLabel("50.0")).toBeTruthy();
    expect(getLabel("stopped").classList).toContain("text-sm");
  });

  test.each([false, true])(
    "follows a change of the fetched block number in the store. hideProgressCircle=%s",
    async (hideProgressCircle) => {
      renderProgress(hideProgressCircle);

      setChain("eth", { fetchedBlockNumber: 150 });
      await tick();
      expect(getLabel("75.0")).toBeTruthy();
      expect(screen.queryByText("50.0")).toBeNull();
    },
  );

  test("follows a change of the number of target contracts in the store", async () => {
    renderProgress(false);

    setChain("eth", { numOfSyncTargetContract: 4 });
    await tick();
    expect(getLabel("25.0")).toBeTruthy();
  });

  test("follows a change of the creation block number in the store", async () => {
    renderProgress(false);

    setChain("eth", { creationBlockNumber: 50 });
    await tick();
    // (100 - 50) / (200 - 50)
    expect(getLabel("33.3")).toBeTruthy();
  });

  test("follows a change of the latest block number in the store", async () => {
    renderProgress(false);

    setLatestBlockNumber("eth", 200);
    await tick();
    expect(getLabel("25.0")).toBeTruthy();
  });

  test.each([false, true])(
    "follows a change of the sync state text in the store. hideProgressCircle=%s",
    async (hideProgressCircle) => {
      renderProgress(hideProgressCircle);
      expect(getLabel("50.0").classList).not.toContain("animate-pulse");

      setChain("eth", { syncStateText: "stopping" });
      await tick();
      expect(getLabel("stopping")).toBeTruthy();
      expect(getLabel("50.0").classList).toContain("animate-pulse");
      expect(screen.queryByText("stopped")).toBeNull();
    },
  );

  test("follows the chain selected in storeUserSettings", async () => {
    renderProgress(false);

    storeUserSettings.update((s) => ({ ...s, selectedChainName: "matic" }));
    await tick();
    expect(getLabel("20.0")).toBeTruthy();
    expect(getLabel("syncing")).toBeTruthy();
    expect(screen.queryByText("50.0")).toBeNull();

    // The store is read with the new chain, not the first one.
    setChain("matic", { fetchedBlockNumber: 40 });
    await tick();
    expect(getLabel("40.0")).toBeTruthy();
    setChain("eth", { fetchedBlockNumber: 200 });
    await tick();
    expect(getLabel("40.0")).toBeTruthy();
  });

  test("follows a change of hideProgressCircle", async () => {
    const { container, rerender } = renderProgress(false);

    await rerender({ hideProgressCircle: true });
    expect(hasCircle(container)).toBe(false);
    expect(getLabel("stopped").classList).toContain("text-sm");

    await rerender({ hideProgressCircle: false });
    expect(hasCircle(container)).toBe(true);
    expect(getLabel("stopped").classList).toContain("text-xl");
  });
});
