import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen, waitFor } from "@testing-library/svelte";
import type { EventAbiFragment } from "@constants/chains/types";
import type {
  AbiFragmentIdentifier,
  ConvertedEventLog,
  SyncStatusContract,
  SyncStatusesChain,
} from "@db/dbTypes";
import { storeSyncStatus } from "@stores/storeSyncStatus";
import { gridRows } from "./gridRows";
import EventLogs, { EVENT_LOGS_RELOAD_INTERVAL } from "./EventLogs.svelte";

// The real store and DB load the chain data, which loads ethers. ethers does
// not load in the client project, so they are replaced.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("./gridRows", () => ({ gridRows: vi.fn() }));
vi.mock("$lib/common/CommonChainExplorerLink.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, { stubName: String(props.value) }),
  };
});
// Shows the number of rows and which column definitions the grid got: the
// same number while the grid gets the same array.
const columnDefsIds = new Map<object, number>();
function columnDefsId(columnDefs: object): number {
  if (!columnDefsIds.has(columnDefs)) {
    columnDefsIds.set(columnDefs, columnDefsIds.size + 1);
  }
  return columnDefsIds.get(columnDefs)!;
}
vi.mock("$lib/grid/BaseGrid.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (
      anchor: unknown,
      props: { rows: unknown[] | undefined; paramColumnDefs: object },
    ) =>
      Stub(anchor as never, {
        get stubName() {
          return `rows=${props.rows?.length} columns=${columnDefsId(props.paramColumnDefs)}`;
        },
      }),
  };
});

const targetEventIdentifier: AbiFragmentIdentifier = {
  chainName: "chain1",
  projectName: "project1",
  versionName: "version1",
  contractName: "contract1",
  abiFragmentName: "Transfer",
} as AbiFragmentIdentifier;
const targetEventAbiFragment = {
  name: "Transfer",
  anonymous: false,
  inputs: [{ name: "values", type: "uint256[]", isArray: () => true }],
} as unknown as EventAbiFragment;

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
function setRecordCount(transfer: number, approval: number = 0): void {
  setContract({
    events: {
      Transfer: { recordCount: transfer },
      Approval: { recordCount: approval },
    },
  });
}

// A log whose array argument has this length.
function log(blockNumber: number, length: number): ConvertedEventLog {
  return {
    blockNumber,
    args: [Array.from({ length }, (_, index) => BigInt(index))],
  } as unknown as ConvertedEventLog;
}

const load = vi.mocked(gridRows);

// Like the sync, save logs of the event. The rows reload within the interval.
async function saveLogs(transfer: number): Promise<void> {
  setRecordCount(transfer);
  await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL);
}

function renderGrid(eventLogType: "text" | "hex") {
  return render(EventLogs, {
    targetEventIdentifier,
    targetEventAbiFragment,
    eventLogType,
    isFullScreen: false,
  });
}
function shown(): { rows: number; columns: number } {
  const text: string = screen.getByTestId("stub").textContent ?? "";
  const match = text.match(/^rows=(\d+) columns=(\d+)$/);
  if (!match) throw new Error(`The grid stub shows "${text}".`);
  return { rows: Number(match[1]), columns: Number(match[2]) };
}

describe("EventLogs.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
    load.mockReset();
    // waitFor checks with setInterval, so keep it real.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("reloads the rows when the record count of the event changes", async () => {
    load.mockResolvedValueOnce([]);
    renderGrid("text");
    await waitFor(() => expect(shown().rows).toBe(0));
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(
      targetEventIdentifier,
      expect.any(AbortSignal),
    );
    const columnsOfNoRows: number = shown().columns;

    // The first log adds a column for the array argument.
    load.mockResolvedValueOnce([log(10, 1)]);
    await saveLogs(1);
    await waitFor(() => expect(shown().rows).toBe(1));
    expect(load).toHaveBeenCalledTimes(2);
    const columnsOfOneItem: number = shown().columns;
    expect(columnsOfOneItem).not.toBe(columnsOfNoRows);

    // Same array lengths: the grid keeps the same column definitions.
    load.mockResolvedValueOnce([log(10, 1), log(20, 1)]);
    await saveLogs(2);
    await waitFor(() => expect(shown().rows).toBe(2));
    expect(shown().columns).toBe(columnsOfOneItem);

    // A longer array: new column definitions.
    load.mockResolvedValueOnce([log(10, 1), log(20, 1), log(30, 2)]);
    await saveLogs(3);
    await waitFor(() => expect(shown().rows).toBe(3));
    expect(shown().columns).not.toBe(columnsOfOneItem);
    expect(load).toHaveBeenCalledTimes(4);
  });

  test("reloads the rows of the hex grid without new column definitions", async () => {
    load.mockResolvedValueOnce([]);
    renderGrid("hex");
    await waitFor(() => expect(shown().rows).toBe(0));
    const columns: number = shown().columns;

    load.mockResolvedValueOnce([log(10, 1), log(20, 2)]);
    await saveLogs(2);
    await waitFor(() => expect(shown().rows).toBe(2));
    expect(shown().columns).toBe(columns);
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("does not reload when only other values change", async () => {
    load.mockResolvedValue([]);
    renderGrid("text");
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    setContract({ fetchedBlockNumber: 200, isSyncing: true });
    setRecordCount(0, 5);
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL);
    await tick();
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("reloads once or twice for saves in a short time, and after the last save", async () => {
    load.mockResolvedValueOnce([]);
    renderGrid("text");
    await waitFor(() => expect(shown().rows).toBe(0));

    // A load reads the logs saved by then.
    let savedLogs: ConvertedEventLog[] = [];
    load.mockImplementation(async () => savedLogs);
    for (let count = 1; count <= 5; count++) {
      savedLogs = Array.from({ length: count }, (_, index) => log(index, 1));
      setRecordCount(count);
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 3);
    const reloads: number = load.mock.calls.length - 1;
    expect(reloads).toBeGreaterThanOrEqual(1);
    expect(reloads).toBeLessThanOrEqual(2);
    await waitFor(() => expect(shown().rows).toBe(5));
  });

  test("stops the running load when the grid closes", async () => {
    load.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = renderGrid("text");
    expect(load).toHaveBeenCalledTimes(1);
    const signal: AbortSignal = load.mock.calls[0][1]!;
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
  });

  test("loads another event at once and stops the load of the previous one", async () => {
    load.mockReturnValueOnce(new Promise(() => {}));
    const { rerender } = renderGrid("text");
    const signal: AbortSignal = load.mock.calls[0][1]!;

    load.mockResolvedValueOnce([log(10, 1)]);
    const approval: AbiFragmentIdentifier = {
      ...targetEventIdentifier,
      abiFragmentName: "Approval",
    } as AbiFragmentIdentifier;
    await rerender({ targetEventIdentifier: approval });
    expect(signal.aborted).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith(approval, expect.any(AbortSignal));
    await waitFor(() => expect(shown().rows).toBe(1));
  });
});
