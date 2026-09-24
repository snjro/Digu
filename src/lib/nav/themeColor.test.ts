import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateDbItemUserSettings } from "@db/dbSettings";
import { getToggledThemeColor, toggleThemeColor } from "./themeColor";

vi.mock("@db/dbSettings", () => ({ updateDbItemUserSettings: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
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
});
