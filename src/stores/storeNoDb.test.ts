import type { BaseSnackbarProps } from "$lib/base/BaseSnackbar.svelte";
import { getScreenWidth } from "@utils/utilsDom";
import { get, writable, type Writable } from "svelte/store";
import { describe, expect, test } from "vitest";
export type OpenStateLeftSidebarAccordion =
  | "openAll"
  | "closeAll"
  | "openCurrentOnly"
  | undefined;
export const storeNoDbOpenLeftSidebarAccordion: Writable<OpenStateLeftSidebarAccordion> =
  writable(undefined);

export const storeNoDbCurrentWidth: Writable<number> = writable(
  getScreenWidth(),
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
export const storeNodbShowLoader: Writable<boolean> = writable(false);

describe("storeNoDbOpenLeftSidebarAccordion", () => {
  test("should have the initial value", () => {
    expect(get(storeNoDbOpenLeftSidebarAccordion)).toBe(undefined);
  });
});
describe("storeNoDbCurrentWidth", () => {
  test("should have the initial value", () => {
    expect(get(storeNoDbCurrentWidth)).toBe(0);
  });
});
describe("storeNoDbSnackBar", () => {
  test("should have the initial value", () => {
    expect(get(storeNoDbSnackBar)).toEqual(storeNoDbSnackBarInitialValue);
  });
});
describe("storeNodbShowLoader", () => {
  test("should have the initial value", () => {
    expect(get(storeNodbShowLoader)).toBe(false);
  });
});
