import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get, type Writable } from "svelte/store";
import { render, screen, waitFor, within } from "@testing-library/svelte";
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
// Shows "<subdirectory>:<value>" of each link, and follows the edges when
// they change (a getter).
vi.mock("#lib/common/CommonChainExplorerLink.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, {
        get stubName() {
          return `${String(props.subdirectory)}:${String(props.value)}`;
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

// The status of contract1 in a state of the store.
function contractOf(state: SyncStatusesChain): SyncStatusContract {
  const contract: SyncStatusContract | undefined =
    state.chain1.subSyncStatuses.project1.subSyncStatuses.version1
      .subSyncStatuses.contract1;
  if (!contract) throw new Error("contract1 is not in the store.");
  return contract;
}
function recordCountOfTransfer(): number {
  const event = contractOf(get(store)).events.Transfer;
  if (!event) throw new Error("Transfer of contract1 is not in the store.");
  return event.recordCount;
}

// Like storeSyncStatus.updateState, return a new state.
function setContract(value: Partial<SyncStatusContract>): void {
  store.update((state) => {
    const newState = structuredClone(state);
    Object.assign(contractOf(newState), value);
    return newState;
  });
}

function log(blockNumber: number): ConvertedEventLog {
  return {
    blockNumber,
    logIndex: 0,
    transactionHash: `0xtx${blockNumber}`,
    // A second for each block, so that each log has its own date.
    jsDate: new Date(Date.UTC(2020, 0, 1) + blockNumber * 1000),
  } as unknown as ConvertedEventLog;
}

// The part of a title (CommonItemMember): the nearest element around the
// title that has the content next to it.
function partOf(title: string): HTMLElement {
  const titleElement: HTMLElement = screen.getByText(title);
  let part: HTMLElement | null = titleElement.parentElement;
  while (
    part &&
    [...part.children].every((child) => child.contains(titleElement))
  ) {
    part = part.parentElement;
  }
  if (!part) throw new Error(`No part around the title "${title}".`);
  return part;
}
// The date shown in the part of an edge, or null when it has none.
function shownDateOf(title: "Latest Log" | "Oldest Log"): string | null {
  const isoDate: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  return within(partOf(title)).queryByText(isoDate)?.textContent ?? null;
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
  // The first load gives two logs, so that its end is seen.
  async function renderWithASlowFirstLoad(
    oldestBlock: number,
    latestBlock: number,
  ): Promise<void> {
    const edges: EventLogEdges = {
      count: 2,
      oldest: log(oldestBlock),
      latest: log(latestBlock),
    };
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
  // Any change of the record count reloads: it saves the one in the store
  // plus one.
  async function saveAndWaitForTheReload(): Promise<void> {
    const recordCount: number = recordCountOfTransfer();
    await vi.advanceTimersByTimeAsync(sinceLoad);
    await save(recordCount + 1);
    await vi.advanceTimersByTimeAsync(
      EVENT_LOGS_RELOAD_INTERVAL - sinceLoad - 1,
    );
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
  }

  test("reloads the logs when the record count of the event changes", async () => {
    await renderWithASlowFirstLoad(5, 6);
    expect(screen.getByText("2")).toBeTruthy();
    // Latest, then oldest: block number and tx hash of each.
    expect(
      screen.getAllByTestId("stub").map((stub) => stub.textContent),
    ).toEqual(["block:6", "tx:0xtx6", "block:5", "tx:0xtx5"]);

    load.mockResolvedValueOnce({ count: 3, oldest: log(10), latest: log(20) });
    await saveAndWaitForTheReload();
    expect(screen.getByText("3")).toBeTruthy();
    expect(
      screen.getAllByTestId("stub").map((stub) => stub.textContent),
    ).toEqual(["block:20", "tx:0xtx20", "block:10", "tx:0xtx10"]);
    expect(shownDateOf("Latest Log")).toBe("2020-01-01T00:00:20Z");
    expect(shownDateOf("Oldest Log")).toBe("2020-01-01T00:00:10Z");
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
    ).toEqual(["block:20", "tx:0xtx20", "block:10", "tx:0xtx10"]);
    expect(shownDateOf("Latest Log")).toBe("2020-01-01T00:00:20Z");
    expect(shownDateOf("Oldest Log")).toBe("2020-01-01T00:00:10Z");
  });

  test("logs a failed load and shows no logs, like the table", async () => {
    await renderWithASlowFirstLoad(10, 11);
    expect(screen.getByText("2")).toBeTruthy();

    const error = new Error("test error");
    load.mockRejectedValueOnce(error);
    await saveAndWaitForTheReload();
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
