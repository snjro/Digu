import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import GridCellSyncStatusTarget from "./GridCellSyncStatusTarget.svelte";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type { SyncStatusContract, SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";

// The real store builds its state from the chain data, which loads ethers.
// ethers does not load in the client project, so the store is a plain one.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("$lib/common/toggleSyncTarget", () => ({
  toggleIsSyncTarget: vi.fn(),
}));

const chain = { name: "chain1" } as Chain;
const project = { name: "project1" } as Project;
const version = { name: "version1" } as Version;
const contract = { name: "contract1" } as Contract;

function syncStatus<T>(name: string, subSyncStatuses: T) {
  return {
    name,
    isSyncTarget: true,
    isSyncing: false,
    isAbort: false,
    fetchedBlockNumber: 0,
    creationBlockNumber: 0,
    numOfSyncTargetContract: 0,
    syncStateText: "stopped",
    subSyncStatuses,
  };
}
function initialState(): SyncStatusesChain {
  return {
    [chain.name]: syncStatus(chain.name, {
      [project.name]: syncStatus(project.name, {
        [version.name]: syncStatus(version.name, {
          [contract.name]: syncStatus(contract.name, null),
        }),
      }),
    }),
  } as unknown as SyncStatusesChain;
}
const store = storeSyncStatus as unknown as Writable<SyncStatusesChain>;

// Like storeSyncStatus.updateState, return a new state.
function setContract(value: Partial<SyncStatusContract> | undefined): void {
  store.update((state) => {
    const newState = structuredClone(state);
    const contracts =
      newState[chain.name].subSyncStatuses[project.name].subSyncStatuses[
        version.name
      ].subSyncStatuses;
    if (value === undefined) {
      delete contracts[contract.name];
    } else {
      Object.assign(contracts[contract.name]!, value);
    }
    return newState;
  });
}
function renderCell() {
  return render(GridCellSyncStatusTarget, {
    targetChain: chain,
    targetProject: project,
    targetVersion: version,
    targetContract: contract,
  });
}
function getCheckbox(): HTMLInputElement {
  return screen.getByRole("checkbox") as HTMLInputElement;
}

describe("GridCellSyncStatusTarget.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
  });

  test("shows the toggle of the contract", () => {
    renderCell();
    expect(screen.getByText("Yes")).toBeTruthy();
    expect(getCheckbox().checked).toBe(true);
  });

  test("follows a change of the sync target in the store", async () => {
    renderCell();

    setContract({ isSyncTarget: false });
    await tick();
    expect(screen.getByText("No")).toBeTruthy();
    expect(getCheckbox().checked).toBe(false);
  });

  test("shows - when the contract has no sync status", async () => {
    renderCell();

    setContract(undefined);
    await tick();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("-", { selector: "label" })).toBeTruthy();
  });
});
