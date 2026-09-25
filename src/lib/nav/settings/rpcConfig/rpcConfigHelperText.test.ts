import { describe, expect, test } from "vitest";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { getRpcConfigHelperTextProps } from "./rpcConfigHelperText";
import type { HelperTextState } from "./RpcConfigChanger.svelte";

describe("getRpcConfigHelperTextProps", () => {
  test("should show Updated. with the check icon on success", () => {
    expect(getRpcConfigHelperTextProps("success", 1, 10000)).toStrictEqual({
      prefixIcon: {
        name: "checkBold",
        colorCategory: "success",
      },
      text: "Updated.",
      colorCategoryFront: colorSettings.navSettings,
    });
  });

  test("should show Checking... without an icon while indeterminate", () => {
    expect(
      getRpcConfigHelperTextProps("indeterminate", 1, 10000),
    ).toStrictEqual({
      text: "Checking...",
      colorCategoryFront: colorSettings.navSettings,
    });
  });

  test.each<[number, number, string]>([
    [1, 10000, "Error. The range should be 1-10000"],
    [0, 5, "Error. The range should be 0-5"],
  ])(
    "should show the allowed range %j-%j with the close icon on error",
    (minValue, maxValue, text) => {
      expect(
        getRpcConfigHelperTextProps("error", minValue, maxValue),
      ).toStrictEqual({
        prefixIcon: {
          name: "close",
          colorCategory: "error",
        },
        text,
        colorCategoryFront: "error",
      });
    },
  );

  test.each<HelperTextState>(["warning", "info", undefined])(
    "should show no text and no icon when the state is %j",
    (helperTextState) => {
      expect(
        getRpcConfigHelperTextProps(helperTextState, 1, 10000),
      ).toStrictEqual({
        prefixIcon: undefined,
        text: undefined,
        colorCategoryFront: undefined,
      });
    },
  );
});
