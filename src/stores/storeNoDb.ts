// TODO: delete this file
import type { BaseSnackbarProps } from "$lib/base/BaseSnackbar.svelte";
import { getScreenWidth } from "@utils/utilsDom";
import { writable, type Writable } from "svelte/store";
export type OpenStateLeftSidebarAccordion =
  | "openAll"
  | "closeAll"
  | "openCurrentOnly"
  | undefined;
export const storeNoDbOpenLeftSidebarAccordion: Writable<OpenStateLeftSidebarAccordion> =
  writable(undefined);

export const storeNoDbCurrentWidth: Writable<number> = writable(
  getScreenWidth()
);

export const storeNoDbSnackBarInitialValue: Readonly<BaseSnackbarProps> = {
  visible: false,
  iconProps: undefined,
  text: undefined,
  displayTimeInMilliseconds: undefined,
};
export const storeNoDbSnackBar: Writable<BaseSnackbarProps> = writable({
  ...storeNoDbSnackBarInitialValue,
});

export const storeNoDbShowDialog: Writable<boolean> = writable(false);
