import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import GridCellSyncStatusBlockNumber from "./GridCellSyncStatusBlockNumber.svelte";
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
const contract = { name: "contract1" } as Contract;

function initialState(): SyncStatusesChain {
  return {
    [chain.name]: {
      subSyncStatuses: {
        [project.name]: {
          subSyncStatuses: {
            [version.name]: {
              subSyncStatuses: {
                [contract.name]: {
                  creationBlockNumber: 1000,
                  fetchedBlockNumber: 2000,
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
function renderCell(headerName: "Start" | "Current" | "Goal") {
  return render(GridCellSyncStatusBlockNumber, {
    targetChain: chain,
    targetProject: project,
    targetVersion: version,
    targetContract: contract,
    headerName,
  });
}
function getLink(): HTMLElement {
  return screen.getByRole("link");
}

describe("GridCellSyncStatusBlockNumber.svelte", () => {
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

  test.each([
    { headerName: "Start", text: "1,000" },
    { headerName: "Current", text: "2,000" },
    { headerName: "Goal", text: "3,000" },
  ] as const)(
    "links the block number of $headerName",
    ({ headerName, text }) => {
      renderCell(headerName);
      expect(getLink().textContent).toContain(text);
      expect(getLink().getAttribute("href")).toBe(
        `https://explorer.example/block/${text.replace(",", "")}`,
      );
    },
  );

  test("follows a change of the fetched block number in the store", async () => {
    renderCell("Current");

    setContract({ fetchedBlockNumber: 2500 });
    await tick();
    expect(getLink().textContent).toContain("2,500");
  });

  test("follows a change of the latest block number in the store", async () => {
    renderCell("Goal");

    setLatestBlockNumber(4000);
    await tick();
    expect(getLink().textContent).toContain("4,000");
  });

  test("shows - for Goal before the chain is synced", () => {
    // The latest block number stays 0 until the first sync of the chain.
    setLatestBlockNumber(0);
    renderCell("Goal");

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("-", { selector: "label" })).toBeTruthy();
  });

  test("shows - when the contract has no sync status", async () => {
    renderCell("Current");

    setContract(undefined);
    await tick();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("-", { selector: "label" })).toBeTruthy();
  });
});
