import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import SyncStatus from "./SyncStatus.svelte";
import type { ChainStatus, SyncStatusesChain } from "#db/dbTypes.js";
import { initialDataUserSettings } from "#db/dbTypes.js";
import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeNoDbCurrentWidth } from "#stores/storeNoDb.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";

// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("#stores/storeSyncStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("#stores/storeChainStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainStatus: writable({}) };
});
// SyncStatusToggle imports these, which load the chain data too.
vi.mock("#eventLogs/syncLock.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncLockedByOtherTab: writable({}) };
});
vi.mock("#eventLogs/eventLogs.js", () => ({ fetchEventLogs: vi.fn() }));
vi.mock("#db/dbEventLogsDataHandlersSyncStatus.js", () => ({
  startAbortingInChain: vi.fn(),
}));
// WarpSyncStatus imports these, which load the chain data too.
vi.mock("#stores/storeRpcSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({ eth: { warpSync: true } }) };
});
vi.mock("#warpSync/warpSync.js", () => ({ retryWarpSync: vi.fn() }));
vi.mock("#utils/utilsDb.js", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
    fullName: "Ethereum Mainnet",
  }),
}));

const syncStatus = storeSyncStatus as unknown as Writable<SyncStatusesChain>;
const chainStatus = storeChainStatus as unknown as Writable<
  Record<string, ChainStatus>
>;
const lockedByOtherTab = storeSyncLockedByOtherTab as unknown as Writable<
  Record<string, boolean>
>;

// The width is compared with breakPointWidths: sm 640, md 768.
type Layout = {
  width: number;
  isOpenSidebar: boolean;
  hideProgressCircle: boolean;
};
const layouts: Layout[] = [
  { width: 1400, isOpenSidebar: true, hideProgressCircle: false },
  { width: 768, isOpenSidebar: true, hideProgressCircle: true },
  { width: 768, isOpenSidebar: false, hideProgressCircle: false },
  { width: 640, isOpenSidebar: false, hideProgressCircle: true },
];

function getRoot(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}
function expectLayout(container: HTMLElement, hideProgressCircle: boolean) {
  const root = getRoot(container);
  expect(root.classList).toContain(
    hideProgressCircle ? "flex-col" : "flex-row",
  );
  expect(root.classList).not.toContain(
    hideProgressCircle ? "flex-row" : "flex-col",
  );
  expect(container.querySelector("svg circle") !== null).toBe(
    !hideProgressCircle,
  );
}
function setLayout(width: number, isOpenSidebar: boolean): void {
  storeNoDbCurrentWidth.set(width);
  storeUserSettings.update((s) => ({ ...s, isOpenSidebar }));
}

describe("SyncStatus.svelte", () => {
  beforeEach(() => {
    syncStatus.set({
      eth: {
        name: "eth",
        isSyncTarget: true,
        creationBlockNumber: 0,
        fetchedBlockNumber: 100,
        numOfSyncTargetContract: 2,
        syncStateText: "stopped",
      },
    } as unknown as SyncStatusesChain);
    chainStatus.set({
      eth: {
        chainName: "eth",
        latestBlockNumber: 100,
        nodeStatus: "SUCCESS",
      } as ChainStatus,
    });
    lockedByOtherTab.set({ eth: false });
  });
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("shows the toggle and the progress", () => {
    setLayout(1400, true);
    render(SyncStatus, { isSyncPanelOpen: false });
    // The toggle, and the progress, which opens the sync panel.
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(
      screen.getByRole("button", {
        name: "Sync of Ethereum Mainnet: 50.0%, stopped",
      }),
    ).toBeTruthy();
    expect(screen.getByText("50.0", { selector: "label" })).toBeTruthy();
  });

  test.each<Layout>(layouts)(
    "lays out by the width and the sidebar. width=$width isOpenSidebar=$isOpenSidebar",
    ({ width, isOpenSidebar, hideProgressCircle }) => {
      setLayout(width, isOpenSidebar);
      const { container } = render(SyncStatus, { isSyncPanelOpen: false });
      expectLayout(container, hideProgressCircle);
    },
  );

  test("follows a change of the width in the store", async () => {
    setLayout(1400, false);
    const { container } = render(SyncStatus, { isSyncPanelOpen: false });
    expectLayout(container, false);

    storeNoDbCurrentWidth.set(640);
    await tick();
    expectLayout(container, true);

    storeNoDbCurrentWidth.set(1400);
    await tick();
    expectLayout(container, false);
  });

  test("follows the sidebar opened in storeUserSettings", async () => {
    setLayout(768, false);
    const { container } = render(SyncStatus, { isSyncPanelOpen: false });
    expectLayout(container, false);

    storeUserSettings.update((s) => ({ ...s, isOpenSidebar: true }));
    await tick();
    expectLayout(container, true);
  });
});
