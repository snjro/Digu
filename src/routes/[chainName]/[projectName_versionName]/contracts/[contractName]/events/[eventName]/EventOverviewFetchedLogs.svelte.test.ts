import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Writable } from "svelte/store";
import { render, screen, waitFor } from "@testing-library/svelte";
import type {
  Chain,
  Contract,
  EventAbiFragment,
  Project,
  Version,
} from "#constants/chains/types.js";
import type {
  ConvertedEventLog,
  SyncStatusContract,
  SyncStatusesChain,
} from "#db/dbTypes.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  getEventLogEdges,
  type EventLogEdges,
} from "#db/dbEventLogsGetEventLogEdges.js";
import { customLogger } from "#utils/logger.js";
import EventOverviewFetchedLogs from "./EventOverviewFetchedLogs.svelte";
import { EVENT_LOGS_RELOAD_INTERVAL } from "./EventLogs.svelte";

// The real store and DB load the chain data, which loads ethers. ethers does
// not load in the client project, so they are replaced.
vi.mock("#stores/storeSyncStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("#db/dbEventLogsGetEventLogEdges.js", () => ({
  getEventLogEdges: vi.fn(),
}));
vi.mock("#utils/logger.js", () => ({
  customLogger: {
    error: vi.fn(),
  },
}));
vi.mock("./EventLogs.svelte", () => ({
  EVENT_LOGS_RELOAD_INTERVAL: 3000,
  MESSAGE_ANONYMOUS_EVENT_LOGS: "Logs of anonymous events are not fetched.",
}));
vi.mock("#lib/common/CommonChainExplorerLink.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    // A getter, so that the stub follows the edges when they change.
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, {
        get stubName() {
          return String(props.value);
        },
      }),
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
        .subSyncStatuses.contract1!,
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

const load = vi.mocked(getEventLogEdges);
const noLogs = { count: 0, oldest: undefined, latest: undefined };

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
  afterEach(() => {
    vi.useRealTimers();
  });

  // A test that waits for the reload interval uses fake timers from the start
  // to the end, without waitFor: they would also fake its timeout.
  async function renderWithFakeTimers(): Promise<void> {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    renderSection();
    await vi.advanceTimersByTimeAsync(0);
  }
  async function save(recordCount: number): Promise<void> {
    setContract({
      events: { Transfer: { recordCount }, Approval: { recordCount: 0 } },
    });
    await vi.advanceTimersByTimeAsync(0);
  }

  // The first load takes loadTime, and the save comes sinceLoad after it
  // ended: the reload starts the interval after the first load ended, not
  // after it started or after the save. They differ, so that no other sum of
  // them gives the same time.
  const loadTime: number = EVENT_LOGS_RELOAD_INTERVAL / 4;
  const sinceLoad: number = EVENT_LOGS_RELOAD_INTERVAL / 2;
  // edges must show something other than "No logs fetched yet.", so that the
  // end of the load can be seen.
  async function renderWithASlowFirstLoad(edges: EventLogEdges): Promise<void> {
    load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(edges), loadTime);
        }),
    );
    await renderWithFakeTimers();
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(loadTime - 1);
    expect(screen.getByText("No logs fetched yet.")).toBeTruthy();
    await vi.advanceTimersByTimeAsync(1);
    expect(screen.queryByText("No logs fetched yet.")).toBeNull();
  }
  async function saveAndWaitForTheReload(recordCount: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(sinceLoad);
    await save(recordCount);
    await vi.advanceTimersByTimeAsync(
      EVENT_LOGS_RELOAD_INTERVAL - sinceLoad - 1,
    );
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
  }

  test("reloads the logs when the record count of the event changes", async () => {
    await renderWithASlowFirstLoad({
      count: 1,
      oldest: log(5),
      latest: log(5),
    });
    expect(screen.getByText("1")).toBeTruthy();

    load.mockResolvedValueOnce({ count: 2, oldest: log(10), latest: log(20) });
    await saveAndWaitForTheReload(2);
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("No logs fetched yet.")).toBeNull();
    // Latest, then oldest: block number and tx hash of each.
    expect(
      screen.getAllByTestId("stub").map((stub) => stub.textContent),
    ).toEqual(["20", "0xtx20", "10", "0xtx10"]);
  });

  test("shows the count of the DB with the two edge logs", async () => {
    load.mockResolvedValueOnce({
      count: 100000,
      oldest: log(10),
      latest: log(20),
    });
    renderSection();
    await waitFor(() => expect(screen.getByText("100,000")).toBeTruthy());
    expect(
      screen.getAllByTestId("stub").map((stub) => stub.textContent),
    ).toEqual(["20", "0xtx20", "10", "0xtx10"]);
    expect(screen.getAllByText("2020-01-01T00:00:00Z")).toHaveLength(2);
  });

  test("logs a failed load and shows no logs, like the table", async () => {
    await renderWithASlowFirstLoad({
      count: 1,
      oldest: log(10),
      latest: log(10),
    });
    expect(screen.getByText("1")).toBeTruthy();

    const error = new Error("test error");
    load.mockRejectedValueOnce(error);
    await saveAndWaitForTheReload(2);
    expect(screen.getByText("No logs fetched yet.")).toBeTruthy();
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

  test("makes one load of many saves in a short time", async () => {
    load.mockResolvedValue(noLogs);
    await renderWithFakeTimers();
    expect(load).toHaveBeenCalledTimes(1);

    for (const recordCount of [1, 2, 3]) {
      await save(recordCount);
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL);
    expect(load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("does not reload when only other values change", async () => {
    load.mockResolvedValue(noLogs);
    await renderWithFakeTimers();
    expect(load).toHaveBeenCalledTimes(1);

    setContract({ fetchedBlockNumber: 200, isSyncing: true });
    setContract({
      events: { Transfer: { recordCount: 0 }, Approval: { recordCount: 5 } },
    });
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
