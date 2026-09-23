import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { fireEvent, render, screen } from "@testing-library/svelte";
import CommonToggleSyncTarget from "./CommonToggleSyncTarget.svelte";
import { toggleIsSyncTarget } from "./toggleSyncTarget";
import type {
  Chain,
  Contract,
  Project,
  Version,
} from "@constants/chains/types";
import type { SyncStatusesChain } from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";

// The real store builds its state from the chain data, which loads ethers.
// ethers does not load in the client project, so the store is a plain one.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("./toggleSyncTarget", () => ({ toggleIsSyncTarget: vi.fn() }));

const chain = { name: "chain1" } as Chain;
const project = { name: "project1" } as Project;
const version = { name: "version1" } as Version;
const contract = { name: "contract1" } as Contract;
const otherContract = { name: "contract2" } as Contract;

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
          [otherContract.name]: syncStatus(otherContract.name, null),
        }),
      }),
    }),
  } as unknown as SyncStatusesChain;
}
const store = storeSyncStatus as unknown as Writable<SyncStatusesChain>;

function getCheckbox(): HTMLInputElement {
  return screen.getByRole("checkbox") as HTMLInputElement;
}
// Like storeSyncStatus.updateState, these return a new state instead of
// changing the current one.
function setContractIsSyncTarget(target: Contract, value: boolean): void {
  store.update((state) => {
    const newState = structuredClone(state);
    newState[chain.name].subSyncStatuses[project.name].subSyncStatuses[
      version.name
    ].subSyncStatuses[target.name].isSyncTarget = value;
    return newState;
  });
}
function setChain(values: { isSyncTarget?: boolean; isSyncing?: boolean }) {
  store.update((state) => {
    const newState = structuredClone(state);
    Object.assign(newState[chain.name], values);
    return newState;
  });
}
const contractProps = {
  targetChain: chain,
  targetProject: project,
  targetVersion: version,
  targetContract: contract,
  size: "md",
} as const;

describe("CommonToggleSyncTarget.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("shows All and a checked box when all targets are on", () => {
    render(CommonToggleSyncTarget, { targetChain: chain, size: "md" });
    expect(screen.getByText("All")).toBeTruthy();
    expect(getCheckbox().checked).toBe(true);
    expect(getCheckbox().indeterminate).toBe(false);
  });

  test("shows Yes for a contract and No after the store turns it off", async () => {
    render(CommonToggleSyncTarget, contractProps);
    expect(screen.getByText("Yes")).toBeTruthy();
    expect(getCheckbox().checked).toBe(true);

    setContractIsSyncTarget(contract, false);
    await tick();
    expect(screen.getByText("No")).toBeTruthy();
    expect(getCheckbox().checked).toBe(false);
  });

  test("shows Partially and an indeterminate box when the children differ", async () => {
    render(CommonToggleSyncTarget, {
      targetChain: chain,
      targetProject: project,
      targetVersion: version,
      size: "md",
    });
    expect(screen.getByText("All")).toBeTruthy();

    setContractIsSyncTarget(contract, false);
    await tick();
    expect(screen.getByText("Partially")).toBeTruthy();
    expect(getCheckbox().indeterminate).toBe(true);
    expect(getCheckbox().classList).toContain("bg-yellow-500");
  });

  test("shows Nothing when the chain is not a sync target", async () => {
    render(CommonToggleSyncTarget, { targetChain: chain, size: "md" });

    setChain({ isSyncTarget: false });
    await tick();
    expect(screen.getByText("Nothing")).toBeTruthy();
    expect(getCheckbox().checked).toBe(false);
  });

  test("disables the box while the chain is syncing", async () => {
    render(CommonToggleSyncTarget, contractProps);
    expect(getCheckbox().disabled).toBe(false);

    setChain({ isSyncing: true });
    await tick();
    expect(getCheckbox().disabled).toBe(true);
  });

  test("follows a change of the target props", async () => {
    const { rerender } = render(CommonToggleSyncTarget, contractProps);
    setContractIsSyncTarget(otherContract, false);
    await tick();
    expect(screen.getByText("Yes")).toBeTruthy();

    await rerender({ targetContract: otherContract });
    expect(screen.getByText("No")).toBeTruthy();
  });

  test("toggles the sync target of the names on click", async () => {
    render(CommonToggleSyncTarget, contractProps);
    await fireEvent.click(getCheckbox());
    expect(toggleIsSyncTarget).toHaveBeenCalledTimes(1);
    expect(toggleIsSyncTarget).toHaveBeenCalledWith(
      chain.name,
      project.name,
      version.name,
      contract.name,
    );
  });

  test("passes undefined for the levels below a chain target", async () => {
    render(CommonToggleSyncTarget, { targetChain: chain, size: "md" });
    await fireEvent.click(getCheckbox());
    expect(toggleIsSyncTarget).toHaveBeenCalledWith(
      chain.name,
      undefined,
      undefined,
      undefined,
    );
  });
});
