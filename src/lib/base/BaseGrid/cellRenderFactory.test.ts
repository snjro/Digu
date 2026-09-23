import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount, unmount } from "svelte";
import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
  type ICellRendererParams,
} from "ag-grid-community";
import {
  cellRendererFactory,
  type AbstractCellRenderer,
} from "./cellRenderFactory";

vi.mock("svelte", () => ({
  mount: vi.fn(
    (_component: unknown, options: { target: HTMLElement; props: unknown }) => {
      options.target.textContent = JSON.stringify(options.props);
      return { options };
    },
  ),
  unmount: vi.fn(),
}));

const params = { value: 1 } as ICellRendererParams;
type Callback = (
  cell: AbstractCellRenderer,
  cellRendererParams: ICellRendererParams,
) => void;

function createRenderer(callback: Callback): AbstractCellRenderer {
  const Renderer = cellRendererFactory(callback);
  const renderer = new Renderer();
  renderer.init(params);
  return renderer;
}

function mountInCell(cell: AbstractCellRenderer): void {
  cell.mount({} as never, { target: cell.eGui, props: { a: 1 } });
}

describe("cellRendererFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("init calls the callback with the renderer and params", () => {
    const callback = vi.fn<Callback>();
    const renderer = createRenderer(callback);
    expect(callback).toHaveBeenCalledWith(renderer, params);
  });

  test("mount in the callback mounts into the cell", () => {
    const renderer = createRenderer(mountInCell);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(renderer.getGui().textContent).toBe('{"a":1}');
  });

  test("destroy unmounts the mounted components once", () => {
    const renderer = createRenderer((cell) => {
      mountInCell(cell);
      mountInCell(cell);
    });
    const mounted = vi.mocked(mount).mock.results.map((result) => result.value);
    renderer.destroy();
    renderer.destroy();
    expect(unmount).toHaveBeenCalledTimes(2);
    expect(unmount).toHaveBeenNthCalledWith(1, mounted[0]);
    expect(unmount).toHaveBeenNthCalledWith(2, mounted[1]);
  });

  test("destroy does nothing when nothing was mounted", () => {
    const renderer = createRenderer(() => {});
    expect(() => renderer.destroy()).not.toThrow();
    expect(unmount).not.toHaveBeenCalled();
  });

  test("refresh asks the grid to recreate the renderer and keeps the component", () => {
    const renderer = createRenderer(mountInCell);
    expect(renderer.refresh()).toBe(false);
    expect(unmount).not.toHaveBeenCalled();
  });
});

describe("cellRendererFactory in a grid", () => {
  type Row = { id: string; a: number };
  const rows: Row[] = [
    { id: "0", a: 10 },
    { id: "1", a: 20 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    ModuleRegistry.registerModules([AllCommunityModule]);
  });

  function setupGrid() {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const gridApi = createGrid<Row>(element, {
      columnDefs: [
        {
          field: "a",
          cellRenderer: cellRendererFactory(
            (
              cell: AbstractCellRenderer,
              cellRendererParams: ICellRendererParams<Row>,
            ) => {
              cell.mount({} as never, {
                target: cell.eGui,
                props: { a: cellRendererParams.value },
              });
            },
          ),
        },
      ],
      rowData: rows,
    });
    const getCellTexts = (): string[] =>
      [...element.querySelectorAll('.ag-cell[col-id="a"]')].map(
        (cell) => cell.textContent ?? "",
      );
    return { gridApi, getCellTexts };
  }

  test("cells keep their content after refreshCells with force", async () => {
    const { gridApi, getCellTexts } = setupGrid();
    await vi.waitFor(() => expect(mount).toHaveBeenCalledTimes(rows.length));

    gridApi.refreshCells({ force: true });

    expect(unmount).toHaveBeenCalledTimes(rows.length);
    expect(mount).toHaveBeenCalledTimes(rows.length * 2);
    expect(getCellTexts()).toEqual(['{"a":10}', '{"a":20}']);
    gridApi.destroy();
  });

  test("components are unmounted when rows are removed and the grid is destroyed", async () => {
    const { gridApi } = setupGrid();
    await vi.waitFor(() => expect(mount).toHaveBeenCalledTimes(rows.length));

    gridApi.setGridOption("rowData", [rows[0]]);
    await vi.waitFor(() =>
      expect(mount).toHaveBeenCalledTimes(rows.length + 1),
    );
    expect(unmount).toHaveBeenCalledTimes(rows.length);

    gridApi.destroy();
    expect(unmount).toHaveBeenCalledTimes(rows.length + 1);
  });
});
