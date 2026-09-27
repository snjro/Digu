import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { get } from "svelte/store";
import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { selectAsUser } from "../../../testUtils/selectAsUser";
import ChainExplorer from "./ChainExplorer.svelte";

// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("@stores/storeUserSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "chain1" }) };
});
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeRpcSettings: writable({ chain1: { chainExplorerIndex: 1 } }),
  };
});
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: () => ({
    name: "chain1",
    chainExplorers: [
      { name: "Explorer A", url: "https://a.example" },
      { name: "Explorer B", url: "https://b.example" },
    ],
  }),
}));
vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));

describe("ChainExplorer.svelte", () => {
  afterEach(() => {
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("shows the saved explorer again when saving the picked one fails", async () => {
    vi.spyOn(customLogger, "error").mockImplementation(() => {});
    vi.mocked(updateDbItemRpcSettings).mockRejectedValueOnce(
      new Error("DB error"),
    );
    render(ChainExplorer);
    const select = screen.getByRole("combobox", {
      name: "Chain Explorer",
    }) as HTMLSelectElement;
    expect(select.value).toBe("1");

    await selectAsUser(select, "0");
    await vi.waitFor(() =>
      expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed),
    );
    expect(updateDbItemRpcSettings).toHaveBeenCalledExactlyOnceWith(
      "chain1",
      "chainExplorerIndex",
      0,
    );
    expect(select.value).toBe("1");
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "https://b.example",
    );
  });
});
