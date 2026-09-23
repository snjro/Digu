import { get } from "svelte/store";
import { describe, expect, test } from "vitest";
import {
  storeNoDbCurrentWidth,
  storeNoDbOpenLeftSidebarAccordion,
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
  storeNodbShowLoader,
} from "./storeNoDb";

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
describe("storeNoDbSnackBarInitialValue", () => {
  test("should have the initial value", () => {
    expect(storeNoDbSnackBarInitialValue).toStrictEqual({
      visible: false,
      iconProps: undefined,
      text: undefined,
      displayTimeInMilliseconds: undefined,
    });
  });
});
describe("storeNoDbSnackBar", () => {
  test("should have a copy of the initial value", () => {
    const snackBar = get(storeNoDbSnackBar);
    expect(snackBar).toStrictEqual(storeNoDbSnackBarInitialValue);
    expect(snackBar).not.toBe(storeNoDbSnackBarInitialValue);
  });
});
describe("storeNodbShowLoader", () => {
  test("should have the initial value", () => {
    expect(get(storeNodbShowLoader)).toBe(false);
  });
});
