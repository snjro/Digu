import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount, unmount } from "svelte";
import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
  type ILoadingOverlayParams,
} from "ag-grid-community";
import {
  loadingOverlayRendererFactory,
  type AbstractOverlayRenderer,
} from "./loadingOverlayRenderFactory";

vi.mock("svelte", () => ({
  mount: vi.fn((_component: unknown, options: { target: HTMLElement }) => {
    options.target.textContent = "spinner";
    return {};
  }),
  unmount: vi.fn(),
}));

const params = { context: undefined } as ILoadingOverlayParams;

function mountInOverlay(overlay: AbstractOverlayRenderer): void {
  overlay.mount({} as never, { target: overlay.eGui });
}

function createRenderer(): AbstractOverlayRenderer {
  const Renderer = loadingOverlayRendererFactory(mountInOverlay);
  const renderer = new Renderer();
  renderer.init(params);
  return renderer;
}

describe("loadingOverlayRendererFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("init mounts the component into the overlay", () => {
    const renderer = createRenderer();
    expect(mount).toHaveBeenCalledTimes(1);
    expect(renderer.getGui().textContent).toBe("spinner");
  });

  test("destroy unmounts the mounted component once", () => {
    const renderer = createRenderer();
    const mounted = vi.mocked(mount).mock.results[0].value;
    renderer.destroy();
    renderer.destroy();
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(unmount).toHaveBeenCalledWith(mounted);
  });

  test("refresh replaces the mounted component", () => {
    const renderer = createRenderer();
    renderer.refresh(params);
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(2);
    renderer.destroy();
    expect(unmount).toHaveBeenCalledTimes(2);
  });
});

describe("loadingOverlayRendererFactory in a grid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ModuleRegistry.registerModules([AllCommunityModule]);
  });

  test("the component is unmounted each time the loading overlay is hidden", async () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const gridApi = createGrid(element, {
      theme: "legacy",
      columnDefs: [{ field: "a" }],
      rowData: [{ a: 1 }],
      loadingOverlayComponent: loadingOverlayRendererFactory(mountInOverlay),
    });

    for (let count = 1; count <= 2; count++) {
      gridApi.setGridOption("loading", true);
      await vi.waitFor(() => expect(mount).toHaveBeenCalledTimes(count));
      gridApi.setGridOption("loading", false);
      await vi.waitFor(() => expect(unmount).toHaveBeenCalledTimes(count));
    }
    gridApi.destroy();
  });
});
