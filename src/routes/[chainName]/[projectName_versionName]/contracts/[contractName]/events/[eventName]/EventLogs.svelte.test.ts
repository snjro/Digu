import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen, waitFor } from "@testing-library/svelte";
import type { EventAbiFragment } from "#constants/chains/types.js";
import type {
  AbiFragmentIdentifier,
  ConvertedEventLog,
  SyncStatusContract,
  SyncStatusesChain,
} from "#db/dbTypes.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import {
  setWarpSyncState,
  storeWarpSync,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
import { gridRows } from "./gridRows";
import EventLogs, {
  EVENT_LOGS_RELOAD_INTERVAL,
  MESSAGE_WAITING_FOR_IMPORT,
} from "./EventLogs.svelte";

// The real store and DB load the chain data, which loads ethers. ethers does
// not load in the client project, so they are replaced.
vi.mock("#stores/storeSyncStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({}) };
});
vi.mock("./gridRows", () => ({ gridRows: vi.fn() }));
vi.mock("#lib/common/CommonChainExplorerLink.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, { stubName: String(props.value) }),
  };
});
// Shows the number of rows, which column definitions the grid got (the same
// number while the grid gets the same array), and the loading text.
const columnDefsIds = new Map<object, number>();
function columnDefsId(columnDefs: object): number {
  if (!columnDefsIds.has(columnDefs)) {
    columnDefsIds.set(columnDefs, columnDefsIds.size + 1);
  }
  return columnDefsIds.get(columnDefs)!;
}
vi.mock("#lib/grid/BaseGrid.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (
      anchor: unknown,
      props: {
        rows: unknown[] | undefined;
        paramColumnDefs: object;
        loadingText?: string;
      },
    ) =>
      Stub(anchor as never, {
        get stubName() {
          return `rows=${props.rows?.length} columns=${columnDefsId(props.paramColumnDefs)} loading=${props.loadingText ?? ""}`;
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
        .subSyncStatuses.contract1!,
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

function renderGrid() {
  return render(EventLogs, {
    targetEventIdentifier,
    targetEventAbiFragment,
    isFullScreen: false,
  });
}
// rows is undefined until the rows are loaded.
function shown(): {
  rows: number | undefined;
  columns: number;
  loadingText: string;
} {
  const text: string = screen.getByTestId("stub").textContent ?? "";
  const match = text.match(/^rows=(\d+|undefined) columns=(\d+) loading=(.*)$/);
  if (!match) throw new Error(`The grid stub shows "${text}".`);
  return {
    rows: match[1] === "undefined" ? undefined : Number(match[1]),
    columns: Number(match[2]),
    loadingText: match[3],
  };
}
function setWarpSync(
  status: WarpSyncState["status"],
  chainName: string = "chain1",
): void {
  setWarpSyncState(chainName as never, { status });
}

describe("EventLogs.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
    storeWarpSync.set({});
    load.mockReset();
    // waitFor checks with setInterval, so keep it real.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("reloads the rows when the record count of the event changes", async () => {
    load.mockResolvedValueOnce([]);
    renderGrid();
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

  test("does not reload when only other values change", async () => {
    load.mockResolvedValue([]);
    renderGrid();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    setContract({ fetchedBlockNumber: 200, isSyncing: true });
    setRecordCount(0, 5);
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL);
    await tick();
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("reloads once or twice for saves in a short time, and after the last save", async () => {
    load.mockResolvedValueOnce([]);
    renderGrid();
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
    const { unmount } = renderGrid();
    expect(load).toHaveBeenCalledTimes(1);
    const signal: AbortSignal = load.mock.calls[0][1]!;
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
  });

  test("loads another event at once and stops the load of the previous one", async () => {
    load.mockReturnValueOnce(new Promise(() => {}));
    const { rerender } = renderGrid();
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
  test("does not show the rows of the previous event while another loads", async () => {
    load.mockResolvedValueOnce([log(10, 1), log(20, 1)]);
    const { rerender } = renderGrid();
    await waitFor(() => expect(shown().rows).toBe(2));

    load.mockReturnValueOnce(new Promise(() => {}));
    await rerender({
      targetEventIdentifier: {
        ...targetEventIdentifier,
        abiFragmentName: "Approval",
      } as AbiFragmentIdentifier,
    });
    expect(shown().rows).toBeUndefined();
  });

  describe("while the warp sync imports the logs of the chain", () => {
    test.each(["imported", "stopped", "failed"] as const)(
      "does not load, and loads once when it is %s",
      async (status) => {
        setWarpSync("importing");
        load.mockResolvedValue([log(10, 1)]);
        renderGrid();
        expect(load).not.toHaveBeenCalled();
        expect(shown()).toMatchObject({
          rows: undefined,
          loadingText: MESSAGE_WAITING_FOR_IMPORT,
        });

        await saveLogs(1);
        await saveLogs(2);
        expect(load).not.toHaveBeenCalled();

        setWarpSync(status);
        await waitFor(() => expect(shown().rows).toBe(1));
        expect(shown().loadingText).toBe("");
        await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
        expect(load).toHaveBeenCalledTimes(1);
      },
    );

    test("keeps the rows of the open table, and reloads them once when it ends", async () => {
      load.mockResolvedValue([log(10, 1)]);
      renderGrid();
      await waitFor(() => expect(shown().rows).toBe(1));

      setWarpSync("importing");
      await saveLogs(1);
      await saveLogs(2);
      expect(load).toHaveBeenCalledTimes(1);
      expect(shown().rows).toBe(1);

      setWarpSync("imported");
      await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
      expect(load).toHaveBeenCalledTimes(2);
    });

    test("loads as usual while it only checks what is left, and not again after it", async () => {
      setWarpSync("checking");
      load.mockResolvedValue([]);
      renderGrid();
      await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
      expect(shown().loadingText).toBe("");

      await saveLogs(1);
      expect(load).toHaveBeenCalledTimes(2);

      setWarpSync("imported");
      await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
      expect(load).toHaveBeenCalledTimes(2);
    });

    test("does not wait for the import of another chain", async () => {
      setWarpSync("importing", "chain2");
      load.mockResolvedValue([]);
      renderGrid();
      await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
      expect(shown().loadingText).toBe("");
      await saveLogs(1);
      expect(load).toHaveBeenCalledTimes(2);
    });
  });
});
