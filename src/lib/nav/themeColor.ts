import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import { updateDbItemUserSettings } from "#db/dbSettings.js";
import type { ThemeColor } from "#db/dbTypes.js";
import { storeNoDbSnackBar } from "#stores/storeNoDb.js";
import { customLogger } from "#utils/logger.js";

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
