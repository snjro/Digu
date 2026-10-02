import { describe, expect, test } from "vitest";
import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
import type { NodeStatus } from "#db/dbTypes.js";
import {
  getRpcInputHelperLabelProps,
  RPC_GUIDE_URL,
} from "./rpcInputHelperLabel";

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
            appendClass: "motion-safe:animate-spin",
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

  test("should show that the RPC cannot be reached, with the link to the guide, when the node status is NETWORK_ERROR", () => {
    expect(getRpcInputHelperLabelProps("NETWORK_ERROR", rpc)).toStrictEqual({
      prefixIcon: {
        name: "close",
        colorCategory: "error",
        size,
      },
      text: "Error. Cannot reach this RPC. Check the URL or use another one.",
      textSize: size,
      colorCategoryFront: "error",
      appendClass: "whitespace-pre-wrap",
      helpHref: RPC_GUIDE_URL,
    });
  });

  test("should ask for the URL without an icon, with the link to the guide, when the node status is INVALID_URL and no RPC URL is entered", () => {
    expect(getRpcInputHelperLabelProps("INVALID_URL", "")).toStrictEqual({
      prefixIcon: undefined,
      text: "Enter URL of RPC.",
      textSize: size,
      colorCategoryFront: "error",
      appendClass: "whitespace-pre-wrap",
      helpHref: RPC_GUIDE_URL,
    });
  });

  test("should link to the section of the guide on the default branch", () => {
    expect(RPC_GUIDE_URL).toBe(
      "https://github.com/snjro/Digu/blob/develop/docs/getting-started-as-user/README.md#rpc-endpoint-url",
    );
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
