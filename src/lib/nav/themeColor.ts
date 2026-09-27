import { showSnackBarAsSaveFailed } from "$lib/common/saveFailed";
import { updateDbItemUserSettings } from "@db/dbSettings";
import type { ThemeColor } from "@db/dbTypes";
import { storeNoDbSnackBar } from "@stores/storeNoDb";
import { customLogger } from "@utils/logger";

export function getToggledThemeColor(
  currentThemeColor: ThemeColor,
): ThemeColor {
  return currentThemeColor === "dark" ? "light" : "dark";
}

export async function toggleThemeColor(
  currentThemeColor: ThemeColor,
): Promise<void> {
  try {
    await updateDbItemUserSettings(
      "themeColor",
      getToggledThemeColor(currentThemeColor),
    );
  } catch (error) {
    customLogger.error("Save the theme color.", error);
    storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
  }
}
