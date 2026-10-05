import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import Layout from "./+layout.svelte";
import { initialDataUserSettings } from "#db/dbTypes.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";
import { saveSelectedChainName } from "#lib/leftSidebar/Header/selectChain.js";
import { customLogger } from "#utils/logger.js";
import {
  storeNoDbCurrentWidth,
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "#stores/storeNoDb.js";
import { get } from "svelte/store";
import { startWarpSync } from "#warpSync/warpSync.js";
import { breakPointWidths } from "#lib/appearanceConfig/size/sizeDefinitions.js";

vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/matic/"),
    params: { chainName: "matic" },
    status: 200,
  },
}));
vi.mock("$app/navigation", () => ({
  onNavigate: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
  goto: vi.fn(),
}));
vi.mock("#lib/common/basePath.js", () => ({ basePath: "" }));
vi.mock("#lib/leftSidebar/Header/selectChain.js", () => ({
  saveSelectedChainName: vi.fn(async () => {}),
}));
// The real chain data and children load ethers, which does not load in the client project.
vi.mock("#constants/chains/_index.js", () => ({
  TARGET_CHAINS: [{ name: "eth" }, { name: "matic" }],
}));
vi.mock("#lib/leftSidebar/LeftSidebar.svelte", () => ({ default: () => {} }));
vi.mock("#lib/nav/Nav.svelte", () => ({ default: () => {} }));
vi.mock("#lib/breadcrumb/Breadcrumb.svelte", () => ({ default: () => {} }));
vi.mock("#warpSync/warpSync.js", () => ({
  startWarpSync: vi.fn(async () => {}),
}));

const initialWidth: number = get(storeNoDbCurrentWidth);

describe("+layout.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
    storeNoDbCurrentWidth.set(initialWidth);
    vi.mocked(saveSelectedChainName).mockClear();
    vi.restoreAllMocks();
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    vi.mocked(startWarpSync).mockClear();
  });

  test("starts the warp sync of the chain in the URL", () => {
    render(Layout);
    expect(startWarpSync).toHaveBeenCalledExactlyOnceWith({ name: "matic" });
  });

  test("saves the chain in the URL when it differs from the saved one", () => {
    storeUserSettings.updateState({ selectedChainName: "eth" });
    render(Layout);
    expect(saveSelectedChainName).toHaveBeenCalledExactlyOnceWith("matic");
  });

  test("does not save when the chain in the URL is the saved one", () => {
    storeUserSettings.updateState({ selectedChainName: "matic" });
    render(Layout);
    expect(saveSelectedChainName).not.toHaveBeenCalled();
  });

  test("only logs when saving the chain in the URL fails", async () => {
    const error = new Error("DB error");
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(saveSelectedChainName).mockRejectedValueOnce(error);
    storeUserSettings.updateState({ selectedChainName: "eth" });
    render(Layout);
    await vi.waitFor(() =>
      expect(customLogger.error).toHaveBeenCalledWith(
        "Save the chain in the URL.",
        error,
      ),
    );
    expect(get(storeNoDbSnackBar).visible).toBe(false);
  });

  // The main area is blocked on a narrow screen with the sidebar open,
  // but the warp sync confirmation can open then without a click.
  test("keeps the warp sync confirmation out of the blocked main area", () => {
    storeNoDbCurrentWidth.set(breakPointWidths.sm);
    storeUserSettings.updateState({ isOpenSidebar: true });
    const { container } = render(Layout);
    expect(container.querySelector(".pointer-events-none")).not.toBeNull();
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog?.closest(".pointer-events-none")).toBeNull();
  });
});
