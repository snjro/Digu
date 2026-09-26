import { beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen, waitFor } from "@testing-library/svelte";
import type {
  Chain,
  Contract,
  EventAbiFragment,
  Project,
  Version,
} from "@constants/chains/types";
import type {
  ConvertedEventLog,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { dbWorkerFuncGetConvertedEventLogs } from "@db/db.worker.func.getConvertedEventLogs";
import { customLogger } from "@utils/logger";
import EventOverviewFetchedLogs from "./EventOverviewFetchedLogs.svelte";

// The real store and DB load the chain data, which loads ethers. ethers does
// not load in the client project, so they are replaced.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("@db/db.worker.func.getConvertedEventLogs", () => ({
  dbWorkerFuncGetConvertedEventLogs: vi.fn(),
}));
vi.mock("@utils/logger", () => ({
  customLogger: {
    error: vi.fn(),
  },
}));
vi.mock("./EventLogs.svelte", () => ({
  MESSAGE_ANONYMOUS_EVENT_LOGS: "Logs of anonymous events are not fetched.",
}));
vi.mock("$lib/common/CommonChainExplorerLink.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, { stubName: String(props.value) }),
  };
});

const targetChain = { name: "chain1" } as Chain;
const targetProject = { name: "project1" } as Project;
const targetVersion = { name: "version1" } as Version;
const targetContract = { name: "contract1" } as Contract;
const targetEventAbiFragment = {
  name: "Transfer",
  anonymous: false,
} as EventAbiFragment;

function initialState(): SyncStatusesChain {
  return {
    chain1: {
      subSyncStatuses: {
        project1: {
          subSyncStatuses: {
            version1: {
              subSyncStatuses: {
                contract1: {
                  fetchedBlockNumber: 100,
                  events: {
                    Transfer: { recordCount: 0 },
                    Approval: { recordCount: 0 },
                  },
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
function setContract(value: Partial<SyncStatusContract>): void {
  store.update((state) => {
    const newState = structuredClone(state);
    Object.assign(
      newState.chain1.subSyncStatuses.project1.subSyncStatuses.version1
        .subSyncStatuses.contract1,
      value,
    );
    return newState;
  });
}

function log(blockNumber: number): ConvertedEventLog {
  return {
    blockNumber,
    logIndex: 0,
    transactionHash: `0xtx${blockNumber}`,
    jsDate: new Date(Date.UTC(2020, 0, 1)),
  } as unknown as ConvertedEventLog;
}

const load = vi.mocked(dbWorkerFuncGetConvertedEventLogs);

function renderSection() {
  return render(EventOverviewFetchedLogs, {
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
    targetEventAbiFragment,
  });
}

describe("EventOverviewFetchedLogs.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
    load.mockReset();
    vi.mocked(customLogger.error).mockClear();
  });

  test("reloads the logs when the record count of the event changes", async () => {
    load.mockResolvedValueOnce([]);
    renderSection();
    await waitFor(() =>
      expect(screen.getByText("No logs fetched yet.")).toBeTruthy(),
    );
    expect(load).toHaveBeenCalledTimes(1);

    load.mockResolvedValueOnce([log(10), log(20)]);
    setContract({
      events: { Transfer: { recordCount: 2 }, Approval: { recordCount: 0 } },
    });
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("No logs fetched yet.")).toBeNull();
    // Latest, then oldest: block number and tx hash of each.
    expect(
      screen.getAllByTestId("stub").map((stub) => stub.textContent),
    ).toEqual(["20", "0xtx20", "10", "0xtx10"]);
  });

  test("logs a failed load and shows no logs, like the table", async () => {
    load.mockResolvedValueOnce([log(10)]);
    renderSection();
    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());

    const error = new Error("test error");
    load.mockRejectedValueOnce(error);
    setContract({
      events: { Transfer: { recordCount: 2 }, Approval: { recordCount: 0 } },
    });
    await waitFor(() =>
      expect(screen.getByText("No logs fetched yet.")).toBeTruthy(),
    );
    expect(customLogger.error).toHaveBeenCalledWith("Get event logs.", {
      eventIdentifier: {
        chainName: "chain1",
        projectName: "project1",
        versionName: "version1",
        contractName: "contract1",
        abiFragmentName: "Transfer",
      },
      errorObject: error,
    });
  });

  test("does not reload when only other values change", async () => {
    load.mockResolvedValue([]);
    renderSection();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    setContract({ fetchedBlockNumber: 200, isSyncing: true });
    setContract({
      events: { Transfer: { recordCount: 0 }, Approval: { recordCount: 5 } },
    });
    await tick();
    await tick();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
