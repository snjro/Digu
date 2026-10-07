import { afterEach, describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import { get } from "svelte/store";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import type { CsvExportParams, GridApi } from "ag-grid-community";
import {
  showSnackBarAsCopied,
  showSnackBarAsCopyFailed,
} from "#lib/common/clipboard.js";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "#stores/storeNoDb.js";
import { customLogger } from "#utils/logger.js";
import { exportBlobToFile } from "#utils/utilsFile.js";
import { ColIdRowSequenceNumber } from "../GridBody/getColumnDefs";
import type { InfiniteRows } from "../infiniteRows";
import type { CsvRequest, CsvResult } from "./csvFormat";
import ExportCsv, { MESSAGE_MAKING_CSV } from "./ExportCsv.svelte";
import {
  CSV_COPY_MAX_ROWS,
  showSnackBarAsCopiedFirstRows,
  showSnackBarAsExportFailed,
  type CsvFilteredSorted,
} from "./exportCsv";

vi.mock("$app/state", () => ({ page: { params: {} } }));
// The snackbar of the dialog flies in, and the test ends before it stops,
// which the browser reports as an error (as BaseSnackbar.svelte.test.ts).
vi.mock("svelte/transition", () => ({ fly: () => ({}) }));
vi.mock("#utils/utilsFile.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#utils/utilsFile.js")>()),
  exportBlobToFile: vi.fn(),
}));

function createGridApi(gridId: string, rowCount: number = 3) {
  const columns = [ColIdRowSequenceNumber, "name"].map((colId) => ({
    getColId: () => colId,
    getOriginalParent: () => null,
  }));
  const listeners: (() => void)[] = [];
  const gridApi = {
    rowCount,
    getGridId: vi.fn(() => gridId),
    getColumns: vi.fn(() => columns),
    getAllDisplayedColumns: vi.fn(() => columns),
    getDisplayNameForColumn: vi.fn((column: (typeof columns)[number]) =>
      column.getColId(),
    ),
    exportDataAsCsv: vi.fn(),
    // Asks for each row as ag-grid does.
    getDataAsCsv: vi.fn((params: CsvExportParams) => {
      const lines: string[] = [];
      for (let index: number = 0; index < gridApi.rowCount; index++) {
        if (!params.shouldRowBeSkipped?.({} as never)) lines.push("row");
      }
      return lines.join("\r\n");
    }),
    forEachNode: vi.fn((callback: () => void) => {
      for (let index: number = 0; index < gridApi.rowCount; index++) {
        callback();
      }
    }),
    getDisplayedRowCount: vi.fn(() => 1),
    addEventListener: vi.fn((_: string, listener: () => void) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((_: string, listener: () => void) => {
      listeners.splice(listeners.indexOf(listener), 1);
    }),
    isDestroyed: vi.fn(() => false),
    // As ag-grid after new rows.
    updateRows(count: number) {
      gridApi.rowCount = count;
      for (const listener of listeners) listener();
    },
  };
  return gridApi as typeof gridApi & GridApi;
}

function button(name: "Export" | "Copy"): HTMLButtonElement {
  return screen.getByRole("button", { name, hidden: true });
}
async function selectFilteredAndSorted(gridId: string): Promise<void> {
  await fireEvent.click(
    document.getElementById(`filteredAndSortedYes${gridId}`)!,
  );
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function csvResult(rowCount: number, totalRowCount: number): CsvResult {
  return { blob: new Blob(["a,b"]), rowCount, totalRowCount };
}
// As the button of the grid opens it.
async function openTheDialog(): Promise<void> {
  document.querySelector("dialog")!.showModal();
  await waitFor(() =>
    expect(document.querySelector("dialog")!.open).toBe(true),
  );
  await tick();
}
type WorkerCsv = (
  request: CsvRequest,
  filteredSorted: CsvFilteredSorted,
) => Promise<CsvResult>;
// The rows of the Infinite Row Model, whose CSV the worker makes.
function workerRows(
  csv: WorkerCsv | undefined,
  rowCounts: Record<CsvFilteredSorted, number | undefined> = {
    all: undefined,
    filteredAndSorted: undefined,
  },
): Pick<InfiniteRows<unknown>, "csv" | "rowCounts"> {
  return { csv, rowCounts };
}
class FakeClipboardItem {
  constructor(readonly items: Record<string, Promise<Blob>>) {}
}
function stubClipboard() {
  const clipboard = {
    // Reads the text, as the browser does.
    write: vi.fn(async (items: FakeClipboardItem[]) => {
      await items[0].items["text/plain"];
    }),
    writeText: vi.fn(async () => {}),
  };
  vi.stubGlobal("navigator", { clipboard });
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  return clipboard;
}

describe("ExportCsv.svelte", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(exportBlobToFile).mockReset();
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
  });

  test("keeps the selected values when the grid id changes", async () => {
    const { rerender } = render(ExportCsv, {
      gridApi: createGridApi("1"),
      exportFilePrefix: "contracts",
    });
    await fireEvent.click(document.getElementById("includeRowNumberNo1")!);

    const gridApi = createGridApi("2");
    await rerender({ gridApi });
    await fireEvent.click(button("Export"));
    expect(gridApi.exportDataAsCsv).toHaveBeenCalledWith(
      expect.objectContaining({ columnKeys: ["name"] }),
    );
  });

  test("Export and Copy do nothing before the grid is created", async () => {
    render(ExportCsv, { gridApi: undefined, exportFilePrefix: "contracts" });
    for (const name of ["Export", "Copy"] as const) {
      await fireEvent.click(button(name));
    }
  });

  test("shows the rows of the selected one, and their changes", async () => {
    const gridApi = createGridApi("1", 1234);
    render(ExportCsv, { gridApi, exportFilePrefix: "contracts" });
    await openTheDialog();
    expect(screen.getByText("1,234 rows")).toBeTruthy();

    gridApi.updateRows(5);
    await waitFor(() => expect(screen.getByText("5 rows")).toBeTruthy());

    await selectFilteredAndSorted("1");
    expect(screen.getByText("1 rows")).toBeTruthy();
  });

  test("counts the rows only while the dialog is open", async () => {
    const gridApi = createGridApi("1", 3);
    render(ExportCsv, { gridApi, exportFilePrefix: "contracts" });
    gridApi.updateRows(4);
    expect(gridApi.forEachNode).not.toHaveBeenCalled();
    expect(screen.queryByText(/rows$/)).toBeNull();

    await openTheDialog();
    expect(screen.getByText("4 rows")).toBeTruthy();
    expect(gridApi.addEventListener).toHaveBeenCalledTimes(1);

    document.querySelector("dialog")!.close();
    await waitFor(() =>
      expect(gridApi.removeEventListener).toHaveBeenCalledTimes(1),
    );
    gridApi.forEachNode.mockClear();
    gridApi.updateRows(5);
    expect(gridApi.forEachNode).not.toHaveBeenCalled();
  });

  describe("the table with a worker", () => {
    test("Export of All: the worker makes the file", async () => {
      const gridApi = createGridApi("1");
      const made = deferred<CsvResult>();
      const csv = vi.fn<WorkerCsv>(() => made.promise);
      render(ExportCsv, {
        gridApi,
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(csv),
      });

      await fireEvent.click(button("Export"));
      expect(csv).toHaveBeenCalledWith(
        {
          columns: [
            {
              colId: ColIdRowSequenceNumber,
              headerName: ColIdRowSequenceNumber,
              groups: [],
            },
            { colId: "name", headerName: "name", groups: [] },
          ],
          columnSeparator: ",",
          suppressQuotes: false,
          skipColumnHeaders: false,
          maxRows: undefined,
        },
        "all",
      );
      expect(gridApi.exportDataAsCsv).not.toHaveBeenCalled();
      // While it makes the file.
      expect(screen.getByText(MESSAGE_MAKING_CSV)).toBeTruthy();
      expect(button("Export").disabled).toBe(true);
      expect(button("Copy").disabled).toBe(true);

      made.resolve(csvResult(3, 3));
      await waitFor(() => expect(exportBlobToFile).toHaveBeenCalledTimes(1));
      const [blob, fileName] = vi.mocked(exportBlobToFile).mock.calls[0];
      expect(await blob.text()).toBe("\uFEFFa,b");
      expect(fileName).toMatch(/^eventLogs-.+\.csv$/);
      expect(button("Export").disabled).toBe(false);
      expect(screen.queryByText(MESSAGE_MAKING_CSV)).toBeNull();
    });

    test("Export of All: tells the failure of the worker", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      const csv = vi.fn(() =>
        Promise.reject(new Error("EventLogsTableWorker: could not load")),
      );
      render(ExportCsv, {
        gridApi: createGridApi("1"),
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(csv),
      });

      await fireEvent.click(button("Export"));
      await waitFor(() =>
        expect(get(storeNoDbSnackBar)).toBe(showSnackBarAsExportFailed),
      );
      expect(exportBlobToFile).not.toHaveBeenCalled();
      expect(button("Export").disabled).toBe(false);
    });

    test("Filtered & Sorted: the worker makes the CSV of the shown columns", async () => {
      const clipboard = stubClipboard();
      const gridApi = createGridApi("1");
      gridApi.getAllDisplayedColumns.mockReturnValue(
        gridApi.getColumns().slice(1),
      );
      const csv = vi.fn<WorkerCsv>(async () => csvResult(1, 1));
      render(ExportCsv, {
        gridApi,
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(csv),
      });
      await selectFilteredAndSorted("1");

      await fireEvent.click(button("Export"));
      await waitFor(() => expect(exportBlobToFile).toHaveBeenCalledTimes(1));
      await fireEvent.click(button("Copy"));
      await waitFor(() => expect(clipboard.write).toHaveBeenCalled());
      expect(
        csv.mock.calls.map(([request, which]) => [request, which]),
      ).toEqual(
        [undefined, CSV_COPY_MAX_ROWS].map((maxRows) => [
          {
            columns: [{ colId: "name", headerName: "name", groups: [] }],
            columnSeparator: ",",
            suppressQuotes: false,
            skipColumnHeaders: false,
            maxRows,
          },
          "filteredAndSorted",
        ]),
      );
      expect(gridApi.exportDataAsCsv).not.toHaveBeenCalled();
      expect(gridApi.getDataAsCsv).not.toHaveBeenCalled();
    });

    test("shows the rows that the worker counts", async () => {
      const gridApi = createGridApi("1");
      const { rerender } = render(ExportCsv, {
        gridApi,
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(vi.fn(), { all: 1234, filteredAndSorted: 7 }),
      });
      await openTheDialog();
      expect(screen.getByText("1,234 rows")).toBeTruthy();

      await rerender({
        infiniteRows: workerRows(vi.fn(), { all: 1235, filteredAndSorted: 7 }),
      });
      await waitFor(() => expect(screen.getByText("1,235 rows")).toBeTruthy());

      await selectFilteredAndSorted("1");
      expect(screen.getByText("7 rows")).toBeTruthy();
      expect(gridApi.forEachNode).not.toHaveBeenCalled();
      expect(gridApi.addEventListener).not.toHaveBeenCalled();
    });

    test("has no CSV while the worker does not have the rows, not even ag-grid's", async () => {
      const clipboard = stubClipboard();
      // ag-grid keeps some blocks, maybe of the previous table.
      const gridApi = createGridApi("1", 2);
      const { rerender } = render(ExportCsv, {
        gridApi,
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(undefined),
      });
      await openTheDialog();
      expect(screen.queryByText(/rows$/)).toBeNull();
      expect(button("Export").disabled).toBe(true);
      expect(button("Copy").disabled).toBe(true);
      await fireEvent.click(button("Export"));
      await fireEvent.click(button("Copy"));
      expect(gridApi.exportDataAsCsv).not.toHaveBeenCalled();
      expect(gridApi.getDataAsCsv).not.toHaveBeenCalled();
      expect(gridApi.forEachNode).not.toHaveBeenCalled();
      expect(clipboard.writeText).not.toHaveBeenCalled();

      // The rows have come.
      await rerender({
        infiniteRows: workerRows(vi.fn(), { all: 3, filteredAndSorted: 3 }),
      });
      await waitFor(() => expect(screen.getByText("3 rows")).toBeTruthy());
      expect(button("Export").disabled).toBe(false);
    });

    test.each([
      // [rows of the CSV, rows before the limit, snackbar]
      [CSV_COPY_MAX_ROWS, CSV_COPY_MAX_ROWS + 1, showSnackBarAsCopiedFirstRows],
      [CSV_COPY_MAX_ROWS, CSV_COPY_MAX_ROWS, showSnackBarAsCopied],
      [2, 2, showSnackBarAsCopied],
    ])(
      "Copy of All: the worker makes the first rows (%i of %i)",
      async (rowCount, totalRowCount, snackbar) => {
        const clipboard = stubClipboard();
        const made = deferred<CsvResult>();
        const csv = vi.fn<WorkerCsv>(() => made.promise);
        render(ExportCsv, {
          gridApi: createGridApi("1"),
          exportFilePrefix: "eventLogs",
          infiniteRows: workerRows(csv),
        });

        await fireEvent.click(button("Copy"));
        expect(csv.mock.calls[0][0].maxRows).toBe(CSV_COPY_MAX_ROWS);
        // The clipboard is asked before the worker ends.
        expect(clipboard.write).toHaveBeenCalledTimes(1);
        expect(button("Copy").disabled).toBe(true);

        made.resolve(csvResult(rowCount, totalRowCount));
        await waitFor(() => expect(get(storeNoDbSnackBar)).toBe(snackbar));
        expect(clipboard.writeText).not.toHaveBeenCalled();
        expect(button("Copy").disabled).toBe(false);
      },
    );

    test("Copy of All without ClipboardItem: copies the text of the worker", async () => {
      const clipboard = stubClipboard();
      vi.stubGlobal("ClipboardItem", undefined);
      const made = deferred<CsvResult>();
      const csv = vi.fn<WorkerCsv>(() => made.promise);
      render(ExportCsv, {
        gridApi: createGridApi("1"),
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(csv),
      });

      await fireEvent.click(button("Copy"));
      expect(csv.mock.calls[0][0].maxRows).toBe(CSV_COPY_MAX_ROWS);
      expect(clipboard.writeText).not.toHaveBeenCalled();

      made.resolve(csvResult(CSV_COPY_MAX_ROWS, CSV_COPY_MAX_ROWS + 1));
      await waitFor(() =>
        expect(get(storeNoDbSnackBar)).toBe(showSnackBarAsCopiedFirstRows),
      );
      expect(clipboard.writeText).toHaveBeenCalledWith("a,b");
      expect(clipboard.write).not.toHaveBeenCalled();
      expect(button("Copy").disabled).toBe(false);
    });

    test("Copy of All: waits for the worker after the copy fails first", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      const clipboard = stubClipboard();
      clipboard.write.mockRejectedValue(new Error("not allowed"));
      const made = deferred<CsvResult>();
      render(ExportCsv, {
        gridApi: createGridApi("1"),
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(() => made.promise),
      });

      await fireEvent.click(button("Copy"));
      await waitFor(() =>
        expect(get(storeNoDbSnackBar)).toBe(showSnackBarAsCopyFailed),
      );
      // The worker still runs.
      expect(button("Copy").disabled).toBe(true);
      expect(screen.getByText(MESSAGE_MAKING_CSV)).toBeTruthy();

      // Its failure is not left unhandled.
      made.reject(new Error("worker failed"));
      await waitFor(() => expect(button("Copy").disabled).toBe(false));
      expect(screen.queryByText(MESSAGE_MAKING_CSV)).toBeNull();
      expect(get(storeNoDbSnackBar)).toBe(showSnackBarAsCopyFailed);
    });

    test("Copy of All: tells the failure of the worker", async () => {
      vi.spyOn(customLogger, "error").mockImplementation(() => {});
      stubClipboard();
      render(ExportCsv, {
        gridApi: createGridApi("1"),
        exportFilePrefix: "eventLogs",
        infiniteRows: workerRows(() =>
          Promise.reject(new Error("worker failed")),
        ),
      });

      await fireEvent.click(button("Copy"));
      await waitFor(() =>
        expect(get(storeNoDbSnackBar)).toBe(showSnackBarAsCopyFailed),
      );
      expect(button("Copy").disabled).toBe(false);
    });
  });

  describe("the tables without a worker", () => {
    test.each([
      [CSV_COPY_MAX_ROWS + 1, showSnackBarAsCopiedFirstRows],
      [CSV_COPY_MAX_ROWS, showSnackBarAsCopied],
      [CSV_COPY_MAX_ROWS - 1, showSnackBarAsCopied],
    ])("Copy takes the first rows: %i rows", async (rowCount, snackbar) => {
      const clipboard = stubClipboard();
      const gridApi = createGridApi("1", rowCount);
      render(ExportCsv, { gridApi, exportFilePrefix: "contracts" });

      await fireEvent.click(button("Copy"));
      await waitFor(() => expect(get(storeNoDbSnackBar)).toBe(snackbar));
      const [text] = clipboard.writeText.mock.calls[0] as unknown as [string];
      expect(text.split("\r\n").length).toBe(
        Math.min(rowCount, CSV_COPY_MAX_ROWS),
      );
    });

    test("Export has all the rows", async () => {
      const gridApi = createGridApi("1", CSV_COPY_MAX_ROWS + 1);
      render(ExportCsv, { gridApi, exportFilePrefix: "contracts" });

      await fireEvent.click(button("Export"));
      expect(gridApi.exportDataAsCsv).toHaveBeenCalledWith(
        expect.not.objectContaining({ shouldRowBeSkipped: expect.anything() }),
      );
    });
  });
});
