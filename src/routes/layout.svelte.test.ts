import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import Layout from "./+layout.svelte";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { saveSelectedChainName } from "$lib/leftSidebar/Header/selectChain";

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
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$lib/leftSidebar/Header/selectChain", () => ({
  saveSelectedChainName: vi.fn(),
}));
// The real chain data and children load ethers, which does not load in the client project.
vi.mock("@constants/chains/_index", () => ({
  TARGET_CHAINS: [{ name: "eth" }, { name: "matic" }],
}));
vi.mock("$lib/leftSidebar/LeftSidebar.svelte", () => ({ default: () => {} }));
vi.mock("$lib/nav/Nav.svelte", () => ({ default: () => {} }));
vi.mock("$lib/breadcrumb/Breadcrumb.svelte", () => ({ default: () => {} }));

describe("+layout.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
    vi.mocked(saveSelectedChainName).mockClear();
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
});
