import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { fireEvent, render, screen } from "@testing-library/svelte";
import SyncStatusToggle from "./SyncStatusToggle.svelte";
import type {
  ChainStatus,
  SyncStateText,
  SyncStatusesChain,
} from "@db/dbTypes";
import { initialDataUserSettings } from "@db/dbTypes";
import { startAbortingInChain } from "@db/dbEventLogsDataHandlersSyncStatus";
import { fetchEventLogs } from "@eventLogs/eventLogs";
import { storeSyncLockedByOtherTab } from "@eventLogs/syncLock";
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
vi.mock("@eventLogs/syncLock", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncLockedByOtherTab: writable({}) };
});
vi.mock("@eventLogs/eventLogs", () => ({ fetchEventLogs: vi.fn() }));
vi.mock("@db/dbEventLogsDataHandlersSyncStatus", () => ({
  startAbortingInChain: vi.fn(),
}));
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
  }),
}));

const CHAINS = ["eth", "matic"] as const;
const syncStatus = storeSyncStatus as unknown as Writable<SyncStatusesChain>;
const chainStatus = storeChainStatus as unknown as Writable<
  Record<string, ChainStatus>
>;
const lockedByOtherTab = storeSyncLockedByOtherTab as unknown as Writable<
  Record<string, boolean>
>;

function setSyncStatus(
  chainName: string,
  values: { isSyncTarget?: boolean; syncStateText?: SyncStateText },
): void {
  // Like storeSyncStatus.updateState, return a new state.
  syncStatus.update((state) => {
    const newState = structuredClone(state);
    Object.assign(newState[chainName], values);
    return newState;
  });
}
function setNodeStatus(
  chainName: string,
  nodeStatus: ChainStatus["nodeStatus"],
) {
  chainStatus.update((state) => ({
    ...state,
    [chainName]: { ...state[chainName], nodeStatus },
  }));
}
function getToggle(): HTMLButtonElement {
  return screen.getByRole("button") as HTMLButtonElement;
}
function getIcon(): SVGElement {
  const svg = getToggle().querySelector("svg");
  if (!svg) throw new Error("no icon");
  return svg;
}
// Resolves fetchEventLogs later, to look at the screen while it starts.
function deferFetch(): (started: boolean) => Promise<void> {
  let resolve: (started: boolean) => void = () => {};
  vi.mocked(fetchEventLogs).mockReturnValueOnce(
    new Promise<boolean>((r) => {
      resolve = r;
    }),
  );
  return async (started: boolean) => {
    resolve(started);
    await tick();
    await tick();
  };
}
async function startSync(): Promise<void> {
  vi.mocked(fetchEventLogs).mockResolvedValueOnce(true);
  await fireEvent.click(getToggle());
  await tick();
}

describe("SyncStatusToggle.svelte", () => {
  beforeEach(() => {
    syncStatus.set(
      Object.fromEntries(
        CHAINS.map((name) => [
          name,
          { name, isSyncTarget: true, syncStateText: "stopped" },
        ]),
      ) as unknown as SyncStatusesChain,
    );
    chainStatus.set(
      Object.fromEntries(
        CHAINS.map((name) => [
          name,
          { chainName: name, latestBlockNumber: 0, nodeStatus: "SUCCESS" },
        ]),
      ),
    );
    lockedByOtherTab.set(Object.fromEntries(CHAINS.map((n) => [n, false])));
  });
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
    vi.clearAllMocks();
  });

  test("is enabled and offers to start when the node and target are ready", () => {
    render(SyncStatusToggle);
    expect(getToggle().disabled).toBe(false);
    expect(screen.getByText("start sync")).toBeTruthy();
    expect(getIcon().id).toBe("pause");
  });

  test("is disabled until the node is ready", async () => {
    setNodeStatus("eth", undefined);
    render(SyncStatusToggle);
    expect(getToggle().disabled).toBe(true);

    setNodeStatus("eth", "SUCCESS");
    await tick();
    expect(getToggle().disabled).toBe(false);
  });

  test("is disabled when the chain is not a sync target", async () => {
    render(SyncStatusToggle);
    setSyncStatus("eth", { isSyncTarget: false });
    await tick();
    expect(getToggle().disabled).toBe(true);
  });

  test("starts the sync of the selected chain on click", async () => {
    const finish = deferFetch();
    render(SyncStatusToggle);

    await fireEvent.click(getToggle());
    expect(fetchEventLogs).toHaveBeenCalledWith({ name: "eth" });
    // Until the sync has started, it cannot be stopped.
    expect(getToggle().disabled).toBe(true);
    expect(screen.getByText("starting sync")).toBeTruthy();

    await finish(true);
    expect(getToggle().disabled).toBe(false);
    expect(screen.getByText("stop sync")).toBeTruthy();
    expect(getIcon().classList).toContain("animate-spin");
  });

  test("turns off again when the sync did not start", async () => {
    const finish = deferFetch();
    render(SyncStatusToggle);

    await fireEvent.click(getToggle());
    await finish(false);
    expect(screen.getByText("start sync")).toBeTruthy();
    expect(getIcon().classList).not.toContain("animate-spin");
  });

  test("stops the sync of the selected chain on the second click", async () => {
    render(SyncStatusToggle);
    await startSync();
    expect(screen.getByText("stop sync")).toBeTruthy();

    await fireEvent.click(getToggle());
    expect(startAbortingInChain).toHaveBeenCalledWith("eth");
    expect(screen.getByText("start sync")).toBeTruthy();
  });

  test("can still stop the sync when the node is not ready", async () => {
    render(SyncStatusToggle);
    await startSync();

    setNodeStatus("eth", undefined);
    await tick();
    expect(getToggle().disabled).toBe(false);

    await fireEvent.click(getToggle());
    expect(startAbortingInChain).toHaveBeenCalledWith("eth");
    expect(getToggle().disabled).toBe(true);
  });

  test("turns off when the sync state becomes stopped", async () => {
    render(SyncStatusToggle);
    await startSync();

    setSyncStatus("eth", { syncStateText: "syncing" });
    await tick();
    expect(getIcon().id).toBe("sync");
    expect(screen.getByText("stop sync")).toBeTruthy();

    setSyncStatus("eth", { syncStateText: "stopped" });
    await tick();
    expect(getIcon().id).toBe("pause");
    expect(screen.getByText("start sync")).toBeTruthy();
  });

  test("follows the sync of a chain selected again, and can stop it", async () => {
    render(SyncStatusToggle);
    await startSync();
    setSyncStatus("eth", { syncStateText: "syncing" });
    await tick();

    storeUserSettings.updateState({ selectedChainName: "matic" });
    await tick();
    expect(screen.getByText("start sync")).toBeTruthy();

    storeUserSettings.updateState({ selectedChainName: "eth" });
    await tick();
    expect(screen.getByText("stop sync")).toBeTruthy();
    expect(getIcon().classList).toContain("animate-spin");

    await fireEvent.click(getToggle());
    expect(startAbortingInChain).toHaveBeenCalledWith("eth");
    expect(fetchEventLogs).toHaveBeenCalledTimes(1);
  });

  test("is disabled and pulses while stopping", async () => {
    const { container } = render(SyncStatusToggle);
    setSyncStatus("eth", { syncStateText: "stopping" });
    await tick();
    expect(getToggle().disabled).toBe(true);
    expect((container.firstElementChild as HTMLElement).classList).toContain(
      "animate-pulse",
    );
  });

  test("is disabled while another tab syncs the chain", async () => {
    render(SyncStatusToggle);
    lockedByOtherTab.update((state) => ({ ...state, eth: true }));
    await tick();
    expect(getToggle().disabled).toBe(true);
    expect(screen.getByText("syncing in another tab")).toBeTruthy();
  });

  test("follows the chain selected in storeUserSettings", async () => {
    setNodeStatus("matic", undefined);
    render(SyncStatusToggle);
    expect(getToggle().disabled).toBe(false);

    storeUserSettings.updateState({ selectedChainName: "matic" });
    await tick();
    expect(getToggle().disabled).toBe(true);

    setNodeStatus("matic", "SUCCESS");
    await tick();
    await startSync();
    expect(fetchEventLogs).toHaveBeenCalledWith({ name: "matic" });
  });
});
