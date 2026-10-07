import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { render, screen, waitFor } from "@testing-library/svelte";
import type { GridApi, IGetRowsParams } from "ag-grid-community";
import type { EventAbiFragment } from "#constants/chains/types.js";
import type {
  AbiFragmentIdentifier,
  SyncStatusContract,
  SyncStatusesChain,
} from "#db/dbTypes.js";
import type {
  EventLogsTableRefreshResult,
  EventLogsTableState,
  StoredEventLog,
} from "#db/eventLogsTable.js";
import type { InfiniteRows } from "#lib/grid/infiniteRows.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
import { customLogger } from "#utils/logger.js";
import {
  setWarpSyncState,
  storeWarpSync,
  type WarpSyncState,
} from "#warpSync/warpSyncState.js";
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
vi.mock("#utils/logger.js", () => ({ customLogger: { error: vi.fn() } }));
vi.mock("#lib/common/CommonChainExplorerLink.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, { stubName: String(props.value) }),
  };
});

// Stands in for the table worker. The test decides what each request gives.
const fakeClients = vi.hoisted(() => {
  const clients: {
    open: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
    csv: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    isClosed: boolean;
  }[] = [];
  return clients;
});
const open =
  vi.fn<(id: AbiFragmentIdentifier) => Promise<EventLogsTableState>>();
const refresh = vi.fn<() => Promise<EventLogsTableRefreshResult>>();
vi.mock("#db/eventLogsTable.worker.portal.js", () => ({
  EventLogsTableClient: vi.fn().mockImplementation(function () {
    const client = {
      open: vi.fn((id: AbiFragmentIdentifier) => open(id)),
      refresh: vi.fn(() => refresh()),
      query: vi.fn(),
      csv: vi.fn(),
      terminate: vi.fn(),
      isClosed: false,
    };
    fakeClients.push(client);
    return client;
  }),
}));

// Shows the rows of the table, which column definitions the grid got (the
// same number while the grid gets the same array), whether it has a
// datasource, and the loading text.
const columnDefsIds = new Map<object, number>();
function columnDefsId(columnDefs: object): number {
  if (!columnDefsIds.has(columnDefs)) {
    columnDefsIds.set(columnDefs, columnDefsIds.size + 1);
  }
  return columnDefsIds.get(columnDefs)!;
}
type GridProps = {
  infiniteRows: InfiniteRows<StoredEventLog>;
  paramColumnDefs: object;
  loadingText?: string;
  gridApi?: GridApi;
};
let gridProps: GridProps | undefined;
const gridApi = {
  refreshInfiniteCache: vi.fn(),
} as unknown as GridApi & { refreshInfiniteCache: ReturnType<typeof vi.fn> };
vi.mock("#lib/grid/BaseGrid.svelte", async () => {
  const { default: Stub } =
    await import("../../functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: GridProps) => {
      // As bind:gridApi of the grid that is created.
      props.gridApi = gridApi;
      return Stub(anchor as never, {
        get stubName() {
          gridProps = props;
          const { datasource, rowCounts } = props.infiniteRows;
          return `rows=${rowCounts.all} datasource=${datasource !== undefined} columns=${columnDefsId(props.paramColumnDefs)} loading=${props.loadingText ?? ""}`;
        },
      });
    },
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

// A table of rowCount rows, whose longest array argument has this length.
function tableState(rowCount: number, length: number = 1): EventLogsTableState {
  return { rowCount, argsMaxLengths: [rowCount === 0 ? 0 : length] };
}
function refreshed(
  rowCount: number,
  length: number = 1,
): EventLogsTableRefreshResult {
  return { ...tableState(rowCount, length), reloaded: false };
}

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
// rows is undefined until the table is read.
function shown(): {
  rows: number | undefined;
  hasDatasource: boolean;
  columns: number;
  loadingText: string;
} {
  const text: string = screen.getByTestId("stub").textContent ?? "";
  const match = text.match(
    /^rows=(\d+|undefined) datasource=(true|false) columns=(\d+) loading=(.*)$/,
  );
  if (!match) throw new Error(`The grid stub shows "${text}".`);
  return {
    rows: match[1] === "undefined" ? undefined : Number(match[1]),
    hasDatasource: match[2] === "true",
    columns: Number(match[3]),
    loadingText: match[4],
  };
}
function setWarpSync(
  status: WarpSyncState["status"],
  chainName: string = "chain1",
): void {
  setWarpSyncState(chainName as never, { status });
}
function lastClient() {
  return fakeClients[fakeClients.length - 1];
}
function getRowsParams(
  startRow: number,
  endRow: number,
): IGetRowsParams & {
  successCallback: ReturnType<typeof vi.fn>;
  failCallback: ReturnType<typeof vi.fn>;
} {
  return {
    startRow,
    endRow,
    sortModel: [{ colId: "blockNumber", sort: "desc" }],
    filterModel: {},
    successCallback: vi.fn(),
    failCallback: vi.fn(),
  } as unknown as ReturnType<typeof getRowsParams>;
}

describe("EventLogs.svelte", () => {
  beforeEach(() => {
    store.set(initialState());
    storeWarpSync.set({});
    fakeClients.length = 0;
    open.mockReset();
    refresh.mockReset();
    vi.mocked(customLogger.error).mockClear();
    gridApi.refreshInfiniteCache.mockClear();
    // waitFor checks with setInterval, so keep it real.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("opens the table of the event in the table worker and gives the grid a datasource", async () => {
    open.mockResolvedValueOnce(tableState(2));
    renderGrid();
    expect(shown()).toMatchObject({ rows: undefined, hasDatasource: false });
    await waitFor(() => expect(shown().rows).toBe(2));
    expect(fakeClients).toHaveLength(1);
    expect(lastClient().open).toHaveBeenCalledWith(targetEventIdentifier);
    expect(shown().hasDatasource).toBe(true);
    expect(gridProps?.infiniteRows.getRowId).toBeTypeOf("function");
  });

  test("refreshes the table when the record count of the event changes", async () => {
    open.mockResolvedValueOnce(tableState(0));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(0));
    const datasource = gridProps?.infiniteRows.datasource;
    const columnsOfNoRows: number = shown().columns;

    // The first log adds a column for the array argument.
    refresh.mockResolvedValueOnce(refreshed(1, 1));
    await saveLogs(1);
    await waitFor(() => expect(shown().rows).toBe(1));
    expect(lastClient().refresh).toHaveBeenCalledTimes(1);
    // The grid reads the shown blocks again with the same datasource.
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalledTimes(1);
    expect(gridProps?.infiniteRows.datasource).toBe(datasource);
    const columnsOfOneItem: number = shown().columns;
    expect(columnsOfOneItem).not.toBe(columnsOfNoRows);

    // Same array lengths: the grid keeps the same column definitions.
    refresh.mockResolvedValueOnce(refreshed(2, 1));
    await saveLogs(2);
    await waitFor(() => expect(shown().rows).toBe(2));
    expect(shown().columns).toBe(columnsOfOneItem);

    // A longer array: new column definitions.
    refresh.mockResolvedValueOnce(refreshed(3, 2));
    await saveLogs(3);
    await waitFor(() => expect(shown().rows).toBe(3));
    expect(shown().columns).not.toBe(columnsOfOneItem);
    expect(lastClient().open).toHaveBeenCalledTimes(1);
    expect(lastClient().refresh).toHaveBeenCalledTimes(3);
    expect(gridApi.refreshInfiniteCache).toHaveBeenCalledTimes(3);
  });

  test("does not refresh when only other values change", async () => {
    open.mockResolvedValue(tableState(0));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(0));

    setContract({ fetchedBlockNumber: 200, isSyncing: true });
    setRecordCount(0, 5);
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL);
    await tick();
    expect(lastClient().refresh).not.toHaveBeenCalled();
  });

  test("refreshes once or twice for saves in a short time, and after the last save", async () => {
    open.mockResolvedValueOnce(tableState(0));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(0));

    // A refresh reads the logs saved by then.
    let savedLogs: number = 0;
    refresh.mockImplementation(async () => refreshed(savedLogs));
    for (let count = 1; count <= 5; count++) {
      savedLogs = count;
      setRecordCount(count);
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 3);
    const refreshes: number = lastClient().refresh.mock.calls.length;
    expect(refreshes).toBeGreaterThanOrEqual(1);
    expect(refreshes).toBeLessThanOrEqual(2);
    await waitFor(() => expect(shown().rows).toBe(5));
  });

  test("stops the worker when the grid closes, and does not log the stopped open", async () => {
    let rejectOpen: (error: Error) => void = () => {};
    open.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectOpen = reject;
      }),
    );
    const { unmount } = renderGrid();
    const client = lastClient();

    unmount();
    expect(client.terminate).toHaveBeenCalledTimes(1);
    rejectOpen(new Error("EventLogsTableWorker: terminated"));
    await vi.advanceTimersByTimeAsync(0);
    expect(customLogger.error).not.toHaveBeenCalled();
  });

  test("stops the worker of an open table when the grid closes", async () => {
    open.mockResolvedValueOnce(tableState(1));
    const { unmount } = renderGrid();
    await waitFor(() => expect(shown().rows).toBe(1));
    const client = lastClient();
    expect(client.terminate).not.toHaveBeenCalled();

    unmount();
    expect(client.terminate).toHaveBeenCalledTimes(1);
  });

  test("opens another event at once in a new worker and stops the previous one", async () => {
    open.mockReturnValueOnce(new Promise(() => {}));
    const { rerender } = renderGrid();
    const previous = lastClient();

    open.mockResolvedValueOnce(tableState(1));
    const approval: AbiFragmentIdentifier = {
      ...targetEventIdentifier,
      abiFragmentName: "Approval",
    } as AbiFragmentIdentifier;
    await rerender({ targetEventIdentifier: approval });
    expect(previous.terminate).toHaveBeenCalledTimes(1);
    expect(fakeClients).toHaveLength(2);
    expect(lastClient().open).toHaveBeenCalledWith(approval);
    await waitFor(() => expect(shown().rows).toBe(1));
  });

  test("does not show the table of the previous event while another opens", async () => {
    open.mockResolvedValueOnce(tableState(2));
    const { rerender } = renderGrid();
    await waitFor(() => expect(shown().rows).toBe(2));

    open.mockReturnValueOnce(new Promise(() => {}));
    await rerender({
      targetEventIdentifier: {
        ...targetEventIdentifier,
        abiFragmentName: "Approval",
      } as AbiFragmentIdentifier,
    });
    expect(shown()).toMatchObject({ rows: undefined, hasDatasource: false });
  });

  test("shows no rows when the table could not be read, and opens it again in a new worker on new logs", async () => {
    open.mockRejectedValueOnce(new Error("open failed"));
    const { unmount } = renderGrid();
    await waitFor(() => expect(shown().rows).toBe(0));
    expect(customLogger.error).toHaveBeenCalledTimes(1);
    expect(shown().hasDatasource).toBe(true);
    expect(gridProps?.infiniteRows.csv).toBeUndefined();
    const params = getRowsParams(0, 100);
    gridProps?.infiniteRows.datasource?.getRows(params);
    expect(params.successCallback).toHaveBeenCalledWith([], 0);

    // After an error of the worker, the client rejects every request.
    expect(fakeClients).toHaveLength(2);
    expect(fakeClients[0].terminate).toHaveBeenCalledTimes(1);

    open.mockResolvedValueOnce(tableState(1));
    await saveLogs(1);
    await waitFor(() => expect(shown().rows).toBe(1));
    expect(fakeClients).toHaveLength(2);
    expect(fakeClients[0].open).toHaveBeenCalledTimes(1);
    expect(fakeClients[1].open).toHaveBeenCalledWith(targetEventIdentifier);
    expect(fakeClients[1].refresh).not.toHaveBeenCalled();
    expect(gridProps?.infiniteRows.csv).toBeTypeOf("function");

    unmount();
    expect(fakeClients[1].terminate).toHaveBeenCalledTimes(1);
  });

  test("opens the table again in a new worker on the next sync, when the worker failed after it opened", async () => {
    open.mockResolvedValue(tableState(1));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(1));
    const datasource = gridProps?.infiniteRows.datasource;

    // The worker fails: the client rejects every request.
    fakeClients[0].isClosed = true;
    refresh.mockRejectedValueOnce(new Error("EventLogsTableWorker: failed"));
    await saveLogs(1);
    expect(fakeClients[0].refresh).toHaveBeenCalledTimes(1);
    expect(fakeClients).toHaveLength(2);

    await saveLogs(2);
    await waitFor(() =>
      expect(gridProps?.infiniteRows.datasource).not.toBe(datasource),
    );
    expect(fakeClients[1].open).toHaveBeenCalledWith(targetEventIdentifier);
    expect(fakeClients[0].refresh).toHaveBeenCalledTimes(1);
    expect(fakeClients[1].refresh).not.toHaveBeenCalled();
  });

  test("refreshes with the same worker after a refresh that failed while the worker lives", async () => {
    open.mockResolvedValue(tableState(1));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(1));

    refresh.mockRejectedValueOnce(new Error("EventLogsTable: DB failed"));
    await saveLogs(1);
    refresh.mockResolvedValueOnce(refreshed(2));
    await saveLogs(2);
    await waitFor(() => expect(shown().rows).toBe(2));
    expect(fakeClients).toHaveLength(1);
    expect(fakeClients[0].refresh).toHaveBeenCalledTimes(2);
  });

  test("the datasource asks the worker for the blocks with the quick search, and counts the rows", async () => {
    open.mockResolvedValueOnce(tableState(5));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(5));
    const infiniteRows = gridProps!.infiniteRows;
    const rows = [{ id: 7 }] as StoredEventLog[];
    lastClient().query.mockResolvedValueOnce({ rows, lastRow: 3 });
    infiniteRows.quickSearch.text = "0xab";

    const params = getRowsParams(100, 200);
    infiniteRows.datasource?.getRows(params);
    expect(lastClient().query).toHaveBeenCalledWith({
      startRow: 100,
      endRow: 200,
      sortModel: [{ colId: "blockNumber", sort: "desc" }],
      filterModel: {},
      quickSearch: "0xab",
    });
    await waitFor(() =>
      expect(params.successCallback).toHaveBeenCalledWith(rows, 3),
    );
    await waitFor(() =>
      expect(gridProps?.infiniteRows.rowCounts).toEqual({
        all: 5,
        filteredAndSorted: 3,
      }),
    );
    expect(infiniteRows.getRowId({ data: rows[0] } as never)).toBe("7");
  });

  test("makes the CSV in the worker of the open table", async () => {
    open.mockResolvedValueOnce(tableState(5));
    renderGrid();
    await waitFor(() => expect(shown().rows).toBe(5));
    const request = { maxRows: 1 } as never;
    lastClient().query.mockResolvedValueOnce({ rows: [], lastRow: 0 });
    const params = getRowsParams(0, 100);
    gridProps?.infiniteRows.datasource?.getRows(params);
    await waitFor(() => expect(params.successCallback).toHaveBeenCalled());

    await gridProps?.infiniteRows.csv?.(request, "all");
    await gridProps?.infiniteRows.csv?.(request, "filteredAndSorted");
    expect(lastClient().csv.mock.calls).toEqual([
      [request, undefined],
      [
        request,
        {
          sortModel: [{ colId: "blockNumber", sort: "desc" }],
          filterModel: {},
          quickSearch: "",
        },
      ],
    ]);
    expect(fakeClients).toHaveLength(1);
  });

  test("leaves the CSV to the grid while the table opens or is imported", async () => {
    let resolveOpen: (state: EventLogsTableState) => void = () => {};
    open.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOpen = resolve;
      }),
    );
    open.mockResolvedValue(tableState(0));
    renderGrid();
    await tick();
    expect(gridProps?.infiniteRows.csv).toBeUndefined();

    resolveOpen(tableState(0));
    await waitFor(() => expect(shown().rows).toBe(0));
    expect(gridProps?.infiniteRows.csv).toBeTypeOf("function");

    setWarpSync("importing");
    await waitFor(() => expect(shown().rows).toBeUndefined());
    expect(gridProps?.infiniteRows.csv).toBeUndefined();

    setWarpSync("imported");
    await waitFor(() => expect(shown().rows).toBe(0));
    expect(gridProps?.infiniteRows.csv).toBeTypeOf("function");
  });

  describe("while the warp sync imports the logs of the chain", () => {
    test.each(["imported", "stopped", "failed"] as const)(
      "does not open the table, and opens it once when it is %s",
      async (status) => {
        setWarpSync("importing");
        open.mockResolvedValue(tableState(1));
        renderGrid();
        expect(fakeClients).toHaveLength(0);
        expect(shown()).toMatchObject({
          rows: undefined,
          hasDatasource: false,
          loadingText: MESSAGE_WAITING_FOR_IMPORT,
        });

        await saveLogs(1);
        await saveLogs(2);
        expect(fakeClients).toHaveLength(0);

        setWarpSync(status);
        await waitFor(() => expect(shown().rows).toBe(1));
        expect(shown().loadingText).toBe("");
        await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
        expect(fakeClients).toHaveLength(1);
        expect(lastClient().open).toHaveBeenCalledTimes(1);
        expect(lastClient().refresh).not.toHaveBeenCalled();
      },
    );

    test("an open table stops its worker and waits, and opens again when it ends", async () => {
      open.mockResolvedValue(tableState(1));
      renderGrid();
      await waitFor(() => expect(shown().rows).toBe(1));
      const client = lastClient();

      setWarpSync("importing");
      await tick();
      expect(client.terminate).toHaveBeenCalledTimes(1);
      expect(shown()).toMatchObject({
        rows: undefined,
        hasDatasource: false,
        loadingText: MESSAGE_WAITING_FOR_IMPORT,
      });
      await saveLogs(1);
      await saveLogs(2);
      expect(fakeClients).toHaveLength(1);
      expect(client.refresh).not.toHaveBeenCalled();

      setWarpSync("imported");
      await waitFor(() => expect(shown().rows).toBe(1));
      expect(fakeClients).toHaveLength(2);
    });

    test("stops a refresh that was waiting or running when it starts", async () => {
      open.mockResolvedValue(tableState(0));
      renderGrid();
      await waitFor(() => expect(shown().rows).toBe(0));
      // Within the interval after the open: this refresh waits.
      setRecordCount(1);
      await tick();
      setWarpSync("importing");
      await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
      expect(fakeClients[0].refresh).not.toHaveBeenCalled();

      // An open that runs when the next import starts.
      open.mockReturnValueOnce(new Promise(() => {}));
      setWarpSync("imported");
      await tick();
      expect(fakeClients).toHaveLength(2);
      setWarpSync("importing");
      await tick();
      expect(fakeClients[1].terminate).toHaveBeenCalledTimes(1);
      expect(shown().rows).toBeUndefined();
    });

    test("refreshes as usual while it only checks what is left, and not again after it", async () => {
      setWarpSync("checking");
      open.mockResolvedValue(tableState(0));
      refresh.mockResolvedValue(refreshed(1));
      renderGrid();
      await waitFor(() => expect(shown().rows).toBe(0));
      expect(shown().loadingText).toBe("");

      await saveLogs(1);
      expect(lastClient().refresh).toHaveBeenCalledTimes(1);

      setWarpSync("imported");
      await vi.advanceTimersByTimeAsync(EVENT_LOGS_RELOAD_INTERVAL * 2);
      expect(fakeClients).toHaveLength(1);
      expect(lastClient().refresh).toHaveBeenCalledTimes(1);
    });

    test("does not wait for the import of another chain", async () => {
      setWarpSync("importing", "chain2");
      open.mockResolvedValue(tableState(0));
      refresh.mockResolvedValue(refreshed(1));
      renderGrid();
      await waitFor(() => expect(shown().rows).toBe(0));
      expect(shown().loadingText).toBe("");
      await saveLogs(1);
      expect(lastClient().refresh).toHaveBeenCalledTimes(1);
    });
  });
});
