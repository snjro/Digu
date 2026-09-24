import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen } from "@testing-library/svelte";
import GridCellNumOfLogs from "./GridCellNumOfLogs.svelte";
import type {
  ContractIdentifier,
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

const contractIdentifier = {
  chainName: "chain1",
  projectName: "project1",
  versionName: "version1",
  contractName: "contract1",
} as ContractIdentifier;
const urlPathName = "/chain1/project1_version1/contracts/contract1/events/";

function initialState(): SyncStatusesChain {
  return {
    [contractIdentifier.chainName]: {
      subSyncStatuses: {
        [contractIdentifier.projectName]: {
          subSyncStatuses: {
            [contractIdentifier.versionName]: {
              subSyncStatuses: {
                [contractIdentifier.contractName]: {
                  events: { Transfer: { recordCount: 1234 } },
                },
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
      newState[contractIdentifier.chainName].subSyncStatuses[
        contractIdentifier.projectName
      ].subSyncStatuses[contractIdentifier.versionName].subSyncStatuses;
    if (value === undefined) {
      delete contracts[contractIdentifier.contractName];
    } else {
      Object.assign(contracts[contractIdentifier.contractName], value);
    }
    return newState;
  });
}
function renderCell(targetEventName: string) {
  return render(GridCellNumOfLogs, {
    contractIdentifier,
    targetEventName,
    urlPathName,
  });
}

describe("GridCellNumOfLogs.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
  });

  test("links the record count to the event logs tab of the event", () => {
    renderCell("Transfer");
    const link = screen.getByRole("link");
    expect(link.textContent).toContain("1,234");
    expect(link.getAttribute("href")).toBe(
      `${urlPathName}Transfer#event-logs-text`,
    );
  });

  test("follows a change of the record count in the store", async () => {
    renderCell("Transfer");

    setContract({ events: { Transfer: { recordCount: 5678 } } });
    await tick();
    expect(screen.getByRole("link").textContent).toContain("5,678");
    expect(screen.queryByText("1,234")).toBeNull();
  });

  test("shows 0 without a link when the event has no log", async () => {
    renderCell("Transfer");

    setContract({ events: { Transfer: { recordCount: 0 } } });
    await tick();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("0", { selector: "label" })).toBeTruthy();
  });

  test("shows - for an event that is not synced", () => {
    renderCell("Approval");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("-", { selector: "label" })).toBeTruthy();
  });

  test("shows - when the contract has no sync status", async () => {
    renderCell("Transfer");

    setContract(undefined);
    await tick();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("-", { selector: "label" })).toBeTruthy();
  });
});
