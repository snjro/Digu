import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import { get, type Writable } from "svelte/store";
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
import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";

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
// fireEvent.click fires change before the microtasks run. A browser changes
// the box, runs the click listeners and then the microtasks, and after that
// fires change, or restores the box when the click was canceled.
async function clickAsUser(input: HTMLInputElement): Promise<void> {
  const { checked, indeterminate } = input;
  input.checked = !checked;
  input.indeterminate = false;
  const click = new Event("click", { bubbles: true, cancelable: true });
  input.dispatchEvent(click);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  if (click.defaultPrevented) {
    input.checked = checked;
    input.indeterminate = indeterminate;
  } else {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  await tick();
}
// Like storeSyncStatus.updateState, these return a new state instead of
// changing the current one.
function setContractIsSyncTarget(target: Contract, value: boolean): void {
  store.update((state) => {
    const newState = structuredClone(state);
    newState[chain.name].subSyncStatuses[project.name].subSyncStatuses[
      version.name
    ].subSyncStatuses[target.name]!.isSyncTarget = value;
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
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    vi.restoreAllMocks();
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

  test("shows - and no box for a contract with no sync status", () => {
    // A contract with no event to sync has no sync status.
    render(CommonToggleSyncTarget, {
      ...contractProps,
      targetContract: { name: "contract3" } as Contract,
    });
    expect(screen.getByText("-")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
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

  test.each([
    [{ targetChain: chain }, "chain1"],
    [{ targetChain: chain, targetProject: project }, "project1"],
    [
      { targetChain: chain, targetProject: project, targetVersion: version },
      "project1 version1",
    ],
    [contractProps, "contract1"],
  ])("names the box by the most specific target (%#)", (props, name) => {
    render(CommonToggleSyncTarget, { size: "md", ...props });
    expect(getCheckbox().getAttribute("aria-label")).toBe(
      `Sync target: ${name}`,
    );
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

  test("changes the box when the store changes after the write", async () => {
    vi.mocked(toggleIsSyncTarget).mockImplementationOnce(async () => {
      setContractIsSyncTarget(contract, false);
    });
    render(CommonToggleSyncTarget, contractProps);

    await clickAsUser(getCheckbox());
    expect(getCheckbox().checked).toBe(false);
    expect(screen.getByText("No")).toBeTruthy();
  });

  test.each([
    ["rejects", () => Promise.reject(new Error("DB error"))],
    [
      "throws",
      () => {
        throw new Error("DB error");
      },
    ],
  ])(
    "shows the save failed snackbar and the saved value when toggling %s",
    async (_, fail) => {
      const spyError = vi
        .spyOn(customLogger, "error")
        .mockImplementation(() => {});
      vi.mocked(toggleIsSyncTarget).mockImplementationOnce(fail);
      render(CommonToggleSyncTarget, contractProps);
      const savedClassName = getCheckbox().className;

      await clickAsUser(getCheckbox());
      expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed);
      expect(spyError).toHaveBeenCalledWith(
        "Toggle the sync target.",
        new Error("DB error"),
      );
      expect(getCheckbox().checked).toBe(true);
      expect(getCheckbox().className).toBe(savedClassName);
      expect(screen.getByText("Yes")).toBeTruthy();
    },
  );

  test("keeps an indeterminate box when toggling fails", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(toggleIsSyncTarget).mockRejectedValueOnce(new Error("DB error"));
    setContractIsSyncTarget(contract, false);
    render(CommonToggleSyncTarget, {
      targetChain: chain,
      targetProject: project,
      targetVersion: version,
      size: "md",
    });
    expect(getCheckbox().indeterminate).toBe(true);

    await clickAsUser(getCheckbox());
    expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed);
    expect(getCheckbox().indeterminate).toBe(true);
    expect(getCheckbox().classList).toContain("bg-yellow-500");
    expect(screen.getByText("Partially")).toBeTruthy();
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
