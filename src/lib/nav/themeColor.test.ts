import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { get } from "svelte/store";
import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";
import { updateDbItemUserSettings } from "@db/dbSettings";
import { getToggledThemeColor, toggleThemeColor } from "./themeColor";

vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
});

describe("getToggledThemeColor", () => {
  test.each([
    ["dark", "light"],
    ["light", "dark"],
  ] as const)("should turn %j into %j", (current, toggled) => {
    expect(getToggledThemeColor(current)).toBe(toggled);
  });
});

describe("toggleThemeColor", () => {
  test.each([
    ["dark", "light"],
    ["light", "dark"],
  ] as const)("should save %j as %j", async (current, toggled) => {
    await toggleThemeColor(current);
    expect(updateDbItemUserSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemUserSettings).toHaveBeenCalledWith(
      "themeColor",
      toggled,
    );
  });

  test("should show the save failed snackbar when saving fails", async () => {
    const error = new Error("DB error");
    const spyError = vi
      .spyOn(customLogger, "error")
      .mockImplementation(() => {});
    vi.mocked(updateDbItemUserSettings).mockRejectedValueOnce(error);
    await toggleThemeColor("dark");
    expect(spyError).toHaveBeenCalledWith("Save the theme color.", error);
    expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed);
  });
});
