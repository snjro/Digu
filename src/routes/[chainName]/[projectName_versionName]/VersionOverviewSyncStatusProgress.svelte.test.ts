import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import VersionOverviewSyncStatusProgress from "./VersionOverviewSyncStatusProgress.svelte";
import type { Chain, Project, Version } from "@constants/chains/types";
import type {
  ChainStatus,
  SyncStatusVersion,
  SyncStatusesChain,
} from "@db/dbTypes";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeSyncStatus } from "@stores/storeSyncStatus";

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
vi.mock("@utils/utilsDb", () => ({ getTargetChain: vi.fn() }));

const chain = { name: "chain1" } as Chain;
const project = { name: "project1" } as Project;
const version = { name: "version1" } as Version;
const otherVersion = { name: "version2" } as Version;

function initialState(): SyncStatusesChain {
  return {
    [chain.name]: {
      subSyncStatuses: {
        [project.name]: {
          subSyncStatuses: {
            // The goal is the latest block number times numOfSyncTargetContract.
            [version.name]: {
              creationBlockNumber: 0,
              fetchedBlockNumber: 100,
              numOfSyncTargetContract: 2,
              syncStateText: "stopped",
            },
            [otherVersion.name]: {
              creationBlockNumber: 0,
              fetchedBlockNumber: 20,
              numOfSyncTargetContract: 1,
              syncStateText: "syncing",
            },
          },
        },
      },
    },
  } as unknown as SyncStatusesChain;
}
const syncStatus = storeSyncStatus as unknown as Writable<SyncStatusesChain>;
const chainStatus = storeChainStatus as unknown as Writable<
  Record<string, ChainStatus>
>;

// Like storeSyncStatus.updateState, return a new state.
function setVersion(target: Version, value: Partial<SyncStatusVersion>): void {
  syncStatus.update((state) => {
    const newState = structuredClone(state);
    Object.assign(
      newState[chain.name].subSyncStatuses[project.name].subSyncStatuses[
        target.name
      ],
      value,
    );
    return newState;
  });
}
function setLatestBlockNumber(latestBlockNumber: number): void {
  chainStatus.update((state) => ({
    ...state,
    [chain.name]: { ...state[chain.name], latestBlockNumber },
  }));
}
function renderProgress() {
  return render(VersionOverviewSyncStatusProgress, {
    targetChain: chain,
    targetProject: project,
    targetVersion: version,
  });
}
// The progress rate and "%" are in separate labels.
function getLabel(text: string): HTMLElement {
  return screen.getByText(text, { selector: "label" });
}

describe("VersionOverviewSyncStatusProgress.svelte", () => {
  beforeEach(() => {
    syncStatus.set(initialState());
    chainStatus.set({
      [chain.name]: {
        chainName: chain.name,
        latestBlockNumber: 100,
        nodeStatus: undefined,
      } as ChainStatus,
    });
  });

  test("shows the title, the progress rate and the sync state text", () => {
    renderProgress();
    expect(getLabel("Progress")).toBeTruthy();
    expect(getLabel("50.0")).toBeTruthy();
    expect(getLabel("stopped")).toBeTruthy();
  });

  test("follows a change of the fetched block number in the store", async () => {
    renderProgress();

    setVersion(version, { fetchedBlockNumber: 150 });
    await tick();
    expect(getLabel("75.0")).toBeTruthy();
    expect(screen.queryByText("50.0")).toBeNull();
  });

  test("follows a change of the number of target contracts in the store", async () => {
    renderProgress();

    setVersion(version, { numOfSyncTargetContract: 4 });
    await tick();
    expect(getLabel("25.0")).toBeTruthy();
  });

  test("follows a change of the latest block number in the store", async () => {
    renderProgress();

    setLatestBlockNumber(200);
    await tick();
    expect(getLabel("25.0")).toBeTruthy();
  });

  test("follows a change of the sync state text in the store", async () => {
    renderProgress();

    setVersion(version, { syncStateText: "stopping" });
    await tick();
    expect(getLabel("stopping").classList).toContain("animate-pulse");
    expect(screen.queryByText("stopped")).toBeNull();
  });

  test("follows a change of the target version", async () => {
    const { rerender } = renderProgress();

    await rerender({ targetVersion: otherVersion });
    expect(getLabel("20.0")).toBeTruthy();
    expect(getLabel("syncing")).toBeTruthy();
    expect(screen.queryByText("50.0")).toBeNull();

    // The store is read with the new version, not the first one.
    setVersion(otherVersion, { fetchedBlockNumber: 40 });
    await tick();
    expect(getLabel("40.0")).toBeTruthy();
    setVersion(version, { fetchedBlockNumber: 200 });
    await tick();
    expect(getLabel("40.0")).toBeTruthy();
  });
});
