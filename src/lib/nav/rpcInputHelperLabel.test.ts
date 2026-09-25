import { describe, expect, test } from "vitest";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
import type { NodeStatus } from "@db/dbTypes";
import { getRpcInputHelperLabelProps } from "./rpcInputHelperLabel";

const size = sizeSettings.navInputHelperText;
const rpc = "https://rpc.example.com";

describe("getRpcInputHelperLabelProps", () => {
  test.each(["", rpc])(
    "should show Connected. when the node status is SUCCESS (rpc %j)",
    (rpcValue) => {
      expect(getRpcInputHelperLabelProps("SUCCESS", rpcValue)).toStrictEqual({
        prefixIcon: {
          name: "checkBold",
          colorCategory: "success",
          size,
        },
        text: "Connected.",
        textSize: size,
        colorCategoryFront: colorSettings.navText,
        appendClass: "whitespace-pre-wrap",
      });
    },
  );

  test.each(["", rpc])(
    "should show Connecting... with a spinning icon when the node status is CONNECTING (rpc %j)",
    (rpcValue) => {
      expect(getRpcInputHelperLabelProps("CONNECTING", rpcValue)).toStrictEqual(
        {
          prefixIcon: {
            name: "sync",
            colorCategory: colorSettings.navText,
            appendClass: "animate-spin",
            size,
          },
          text: "Connecting...",
          textSize: size,
          colorCategoryFront: colorSettings.navText,
          appendClass: "whitespace-pre-wrap",
        },
      );
    },
  );

  test.each<[NodeStatus, string, string]>([
    ["INVALID_PROTOCOL", rpc, "Error. Protocol is invalid."],
    ["INVALID_URL", rpc, "Error. Invalid URL."],
    ["WRONG_CHAIN", rpc, "Error. Target chain is wrong."],
    ["NETWORK_ERROR", rpc, "Error. cannot get a network data."],
  ])(
    "should show an error with the close icon when the node status is %j (rpc %j)",
    (nodeStatus, rpcValue, text) => {
      expect(getRpcInputHelperLabelProps(nodeStatus, rpcValue)).toStrictEqual({
        prefixIcon: {
          name: "close",
          colorCategory: "error",
          size,
        },
        text,
        textSize: size,
        colorCategoryFront: "error",
        appendClass: "whitespace-pre-wrap",
      });
    },
  );

  test("should ask for the URL without an icon when the node status is INVALID_URL and no RPC URL is entered", () => {
    expect(getRpcInputHelperLabelProps("INVALID_URL", "")).toStrictEqual({
      prefixIcon: undefined,
      text: "Enter URL of RPC.",
      textSize: size,
      colorCategoryFront: "error",
      appendClass: "whitespace-pre-wrap",
    });
  });

  test.each(["", rpc])(
    "should show no text and no icon when the node status is undefined (rpc %j)",
    (rpcValue) => {
      expect(getRpcInputHelperLabelProps(undefined, rpcValue)).toStrictEqual({
        prefixIcon: undefined,
        text: undefined,
        textSize: size,
        colorCategoryFront: "error",
        appendClass: "whitespace-pre-wrap",
      });
    },
  );
});
