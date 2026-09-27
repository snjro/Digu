import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import { updateChainExplorerIndex } from "./chainExplorerIndex";

vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
});

describe("updateChainExplorerIndex", () => {
  test.each([
    ["0", 0],
    ["1", 1],
    ["10", 10],
  ])("should save the selected value %j as %j", async (value, index) => {
    await expect(updateChainExplorerIndex("eth", value)).resolves.toBe(true);
    expect(updateDbItemRpcSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith(
      "eth",
      "chainExplorerIndex",
      index,
    );
  });

  test("should show the save failed snackbar when saving fails", async () => {
    const error = new Error("DB error");
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    vi.mocked(updateDbItemRpcSettings).mockRejectedValueOnce(error);
    await expect(updateChainExplorerIndex("eth", "1")).resolves.toBe(false);
    expect(spyError).toHaveBeenCalledWith("Save the chain explorer.", error);
    expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed);
  });
});
