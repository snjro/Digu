import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import ContractOverviewSyncStatusProgress from "./ContractOverviewSyncStatusProgress.svelte";
import { breakPointWidths } from "$lib/appearanceConfig/size/sizeDefinitions";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import { baseTextSizes, changeSize } from "$lib/base/baseSizes";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type {
  ChainStatus,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";
import { storeChainStatus } from "@stores/storeChainStatus";
import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
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
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({ eth: { chainExplorerIndex: 0 } }) };
});
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: ({ chainName }: { chainName: string }) => ({
    name: chainName,
    chainExplorers: [
      {
        url: "https://explorer.example",
        subdirectory: { address: "address", tx: "tx", block: "block" },
      },
    ],
  }),
}));

const chain = { name: "chain1" } as Chain;
const project = { name: "project1" } as Project;
const version = { name: "version1" } as Version;
// The start is the creation block of the contract props, not the store.
const contract = {
  name: "contract1",
  creation: { blockNumber: 1000 },
} as Contract;
const otherContract = {
  name: "contract2",
  creation: { blockNumber: 2000 },
} as Contract;

function initialState(): SyncStatusesChain {
  return {
    [chain.name]: {
      subSyncStatuses: {
        [project.name]: {
          subSyncStatuses: {
            [version.name]: {
              subSyncStatuses: {
                [contract.name]: {
                  fetchedBlockNumber: 2000,
                  syncStateText: "stopped",
                },
                [otherContract.name]: {
                  fetchedBlockNumber: 2500,
                  syncStateText: "syncing",
                },
              },
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
function setContract(
  target: Contract,
  value: Partial<SyncStatusContract>,
): void {
  syncStatus.update((state) => {
    const newState = structuredClone(state);
    Object.assign(
      newState[chain.name].subSyncStatuses[project.name].subSyncStatuses[
        version.name
      ].subSyncStatuses[target.name],
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
  return render(ContractOverviewSyncStatusProgress, {
    targetChain: chain,
    targetProject: project,
    targetVersion: version,
    targetContract: contract,
  });
}
// The progress rate and "%" are in separate labels.
function getLabel(text: string): HTMLElement {
  return screen.getByText(text, { selector: "label" });
}
// The details under the circle: start, current and goal.
function getBlockNumberTexts(): (string | undefined)[] {
  return screen.getAllByRole("link").map((link) => link.textContent?.trim());
}

describe("ContractOverviewSyncStatusProgress.svelte", () => {
  beforeEach(() => {
    syncStatus.set(initialState());
    chainStatus.set({
      [chain.name]: {
        chainName: chain.name,
        latestBlockNumber: 3000,
        nodeStatus: undefined,
      } as ChainStatus,
    });
    storeNoDbCurrentWidth.set(breakPointWidths.lg);
  });

  test("shows the progress rate, the sync state text and the details", () => {
    renderProgress();
    expect(getLabel("Progress")).toBeTruthy();
    expect(getLabel("50.0")).toBeTruthy();
    expect(getLabel("stopped")).toBeTruthy();
    expect(getLabel("start")).toBeTruthy();
    expect(getLabel("current")).toBeTruthy();
    expect(getLabel("goal")).toBeTruthy();
    expect(getBlockNumberTexts()).toEqual(["1,000", "2,000", "3,000"]);
  });

  test("follows a change of the fetched block number in the store", async () => {
    renderProgress();

    setContract(contract, { fetchedBlockNumber: 1500 });
    await tick();
    expect(getLabel("25.0")).toBeTruthy();
    expect(getBlockNumberTexts()).toEqual(["1,000", "1,500", "3,000"]);
  });

  test("follows a change of the latest block number in the store", async () => {
    renderProgress();

    setLatestBlockNumber(5000);
    await tick();
    expect(getLabel("25.0")).toBeTruthy();
    expect(getBlockNumberTexts()).toEqual(["1,000", "2,000", "5,000"]);
  });

  test("follows a change of the sync state text in the store", async () => {
    renderProgress();

    setContract(contract, { syncStateText: "stopping" });
    await tick();
    expect(getLabel("stopping").classList).toContain("animate-pulse");
    expect(screen.queryByText("stopped")).toBeNull();
  });

  test("makes the details smaller on a narrow screen", async () => {
    const itemSize = sizeSettings.itemMember;
    renderProgress();
    expect(getLabel("start").classList).toContain(baseTextSizes[itemSize]);

    storeNoDbCurrentWidth.set(breakPointWidths.md);
    await tick();
    expect(getLabel("start").classList).toContain(
      baseTextSizes[changeSize(itemSize, -1)],
    );
  });

  test("follows a change of the target contract", async () => {
    const { rerender } = renderProgress();

    await rerender({ targetContract: otherContract });
    expect(getLabel("50.0")).toBeTruthy();
    expect(getLabel("syncing")).toBeTruthy();
    expect(getBlockNumberTexts()).toEqual(["2,000", "2,500", "3,000"]);

    // The store is read with the new contract, not the first one.
    setContract(otherContract, { fetchedBlockNumber: 2750 });
    await tick();
    expect(getLabel("75.0")).toBeTruthy();
    setContract(contract, { fetchedBlockNumber: 3000 });
    await tick();
    expect(getLabel("75.0")).toBeTruthy();
  });
});
