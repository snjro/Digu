import { updateDbItemUserSettings } from "@db/dbSettings";
import type { ThemeColor } from "@db/dbTypes";

export function getToggledThemeColor(
  currentThemeColor: ThemeColor,
): ThemeColor {
  return currentThemeColor === "dark" ? "light" : "dark";
}

export async function toggleThemeColor(
  currentThemeColor: ThemeColor,
): Promise<void> {
  await updateDbItemUserSettings(
    "themeColor",
    getToggledThemeColor(currentThemeColor),
  );
}
