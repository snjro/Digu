import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import GridCellSyncStatusSyncStateText from "./GridCellSyncStatusSyncStateText.svelte";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type {
  SyncStateText,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";

// The real store builds its state from the chain data, which loads ethers.
// ethers does not load in the client project, so the store is a plain one.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});

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
                [contract.name]: { syncStateText: "stopped" },
              },
            },
          },
        },
      },
    },
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
function getLabel(text: SyncStateText): HTMLElement {
  return screen.getByText(text, { selector: "label" });
}
const props = {
  targetChain: chain,
  targetProject: project,
  targetVersion: version,
  targetContract: contract,
};

describe("GridCellSyncStatusSyncStateText.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
  });

  test("shows the sync state text of the contract", () => {
    render(GridCellSyncStatusSyncStateText, props);
    expect(getLabel("stopped").classList).not.toContain("animate-pulse");
  });

  test("follows a change of the sync state text in the store", async () => {
    render(GridCellSyncStatusSyncStateText, props);

    setContract({ syncStateText: "syncing" });
    await tick();
    expect(getLabel("syncing")).toBeTruthy();
    expect(screen.queryByText("stopped")).toBeNull();

    setContract({ syncStateText: "stopping" });
    await tick();
    expect(getLabel("stopping").classList).toContain("animate-pulse");
  });

  test("shows no data when the contract has no sync status", async () => {
    render(GridCellSyncStatusSyncStateText, props);

    setContract(undefined);
    await tick();
    expect(screen.queryByText("stopped")).toBeNull();
    expect(getLabel("-")).toBeTruthy();
  });
});
