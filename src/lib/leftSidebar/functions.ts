import { breakPointWidths } from "#lib/appearanceConfig/size/sizeDefinitions.js";
import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import { updateDbItemUserSettings } from "#db/dbSettings.js";
import { trailingSlash } from "#lib/common/trailingSlash.js";
import { storeNoDbCurrentWidth, storeNoDbSnackBar } from "#stores/storeNoDb.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";
import { customLogger } from "#utils/logger.js";
import { get } from "svelte/store";

export async function toggleLeftSideBar(): Promise<void> {
  const isOpenSidebar = get(storeUserSettings).isOpenSidebar;
  try {
    await updateDbItemUserSettings("isOpenSidebar", !isOpenSidebar);
  } catch (error) {
    customLogger.error("Save the sidebar state.", error);
    storeNoDbSnackBar.set(showSnackBarAsSaveFailed);
  }
}
export async function toggleLeftSideBarWithCondition(): Promise<void> {
  if (get(storeNoDbCurrentWidth) <= breakPointWidths.sm) {
    await toggleLeftSideBar();
  }
}

export function isHrefParentOfPathname(
  href: string,
  pathname: string,
): boolean {
  const splitHref: string[] = href.split("/");
  const splitPathname: string[] = pathname.split("/");
  if (splitHref.length >= splitPathname.length) {
    return false;
  } else {
    for (let i = 0; i <= splitHref.length - 1; i++) {
      if (splitHref[i] !== splitPathname[i]) {
        return false;
      }
    }
    return true;
  }
}
export function isSelectedDirectory(href: string, pathname: string): boolean {
  const hrefWithTrailingSlash: string =
    trailingSlash === "always" ? `${href}/` : href;
  return pathname.endsWith(hrefWithTrailingSlash);
}
