import { updateDbItemUserSettings } from "@db/dbSettingsDataHandlers";
import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
import { storeUserSettings } from "@stores/storeUserSettings";
import { breakPointWidths } from "@utils/utilsDom";
import { get } from "svelte/store";

export async function toggleLeftSideBar(): Promise<void> {
  const isOpenSidebar = get(storeUserSettings).isOpenSidebar;
  await updateDbItemUserSettings("isOpenSidebar", !isOpenSidebar);
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
