import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import GridCellSyncStatusProgressBar from "./GridCellSyncStatusProgressBar.svelte";
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
// The bar imports CommonChainExplorerLink, which loads the chain data too.
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({}) };
});
vi.mock("@utils/utilsDb", () => ({ getTargetChain: vi.fn() }));

const chain = { name: "chain1" } as Chain;
const project = { name: "project1" } as Project;
const version = { name: "version1" } as Version;
const contract = {
  name: "contract1",
  creation: { blockNumber: 1000 },
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
                  isSyncing: false,
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
function setContract(value: Partial<SyncStatusContract> | undefined): void {
  syncStatus.update((state) => {
    const newState = structuredClone(state);
    const contracts =
      newState[chain.name].subSyncStatuses[project.name].subSyncStatuses[
        version.name
      ].subSyncStatuses;
    if (value === undefined) {
      delete contracts[contract.name];
    } else {
      Object.assign(contracts[contract.name], value);
    }
    return newState;
  });
}
function setLatestBlockNumber(latestBlockNumber: number): void {
  chainStatus.update((state) => ({
    ...state,
    [chain.name]: { ...state[chain.name], latestBlockNumber },
  }));
}
function renderCell() {
  return render(GridCellSyncStatusProgressBar, {
    targetChain: chain,
    targetProject: project,
    targetVersion: version,
    targetContract: contract,
  });
}
function getRateLabel(text: string): HTMLElement {
  return screen.getByText(text, { selector: "label" });
}

describe("GridCellSyncStatusProgressBar.svelte", () => {
  beforeEach(() => {
    syncStatus.set(initialState());
    chainStatus.set({
      [chain.name]: {
        chainName: chain.name,
        latestBlockNumber: 3000,
        nodeStatus: undefined,
      } as ChainStatus,
    });
  });

  test("shows the progress rate from the creation to the latest block", () => {
    renderCell();
    expect(getRateLabel("50.0%")).toBeTruthy();
  });

  test("follows a change of the fetched block number in the store", async () => {
    renderCell();

    setContract({ fetchedBlockNumber: 1500 });
    await tick();
    expect(getRateLabel("25.0%")).toBeTruthy();
    expect(screen.queryByText("50.0%")).toBeNull();
  });

  test("follows a change of the latest block number in the store", async () => {
    renderCell();

    setLatestBlockNumber(5000);
    await tick();
    expect(getRateLabel("25.0%")).toBeTruthy();
  });

  test("animates the bar while the contract is syncing", async () => {
    const { container } = renderCell();
    expect(container.querySelector(".background-animate")).toBeNull();

    setContract({ isSyncing: true });
    await tick();
    expect(container.querySelector(".background-animate")).not.toBeNull();
  });

  test("shows - when nothing is fetched yet", async () => {
    renderCell();

    setContract({ fetchedBlockNumber: 0 });
    await tick();
    expect(screen.queryByText("50.0%")).toBeNull();
    expect(getRateLabel("-")).toBeTruthy();
  });

  test("shows - when the contract has no sync status", async () => {
    renderCell();

    setContract(undefined);
    await tick();
    expect(screen.queryByText("50.0%")).toBeNull();
    expect(getRateLabel("-")).toBeTruthy();
  });
});
