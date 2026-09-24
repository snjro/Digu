import { describe, expect, test } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { initialDataRpcSetting } from "@db/dbTypes";
import type { StateRpcSettings } from "@stores/storeTypes";
import { TargetNotFoundError } from "@utils/utlisDb";
import {
  getChainExplorerHref,
  getChainExplorerLinkText,
  getChainExplorerUrl,
  type CommonChainExplorerLinkProps,
} from "./chainExplorerLink";

function rpcSettings(chainExplorerIndex: number): StateRpcSettings {
  const state: StateRpcSettings = {};
  for (const targetChain of TARGET_CHAINS) {
    state[targetChain.name] = {
      ...initialDataRpcSetting(targetChain),
      chainExplorerIndex: chainExplorerIndex,
    };
  }
  return state;
}

describe("getChainExplorerUrl", () => {
  test.each(
    TARGET_CHAINS.flatMap((targetChain) =>
      targetChain.chainExplorers.map(
        (chainExplorer, index) =>
          [targetChain.name, index, chainExplorer.url] as const,
      ),
    ),
  )("chain %j with explorer %i gives %j", (chainName, index, expected) => {
    expect(getChainExplorerUrl(chainName, rpcSettings(index))).toBe(expected);
  });
  test("an unknown chain throws", () => {
    expect(() => getChainExplorerUrl("unknown", rpcSettings(0))).toThrow(
      TargetNotFoundError,
    );
  });
});

describe("getChainExplorerHref", () => {
  test.each<
    [
      CommonChainExplorerLinkProps["subdirectory"],
      CommonChainExplorerLinkProps["value"],
      string,
    ]
  >([
    ["address", "0xabc", "https://etherscan.io/address/0xabc"],
    ["tx", "0xdef", "https://etherscan.io/tx/0xdef"],
    ["block", "1234567", "https://etherscan.io/block/1234567"],
    ["block", undefined, "https://etherscan.io/block/undefined"],
  ])("%s and %j give %j", (subdirectory, value, expected) => {
    expect(
      getChainExplorerHref("https://etherscan.io", subdirectory, value),
    ).toBe(expected);
  });
});

describe("getChainExplorerLinkText", () => {
  test.each<
    [
      CommonChainExplorerLinkProps["subdirectory"],
      CommonChainExplorerLinkProps["value"],
      CommonChainExplorerLinkProps["value"],
    ]
  >([
    ["block", "999", "999"],
    ["block", "1000", "1,000"],
    ["block", "1234567", "1,234,567"],
    ["block", "", ""],
    ["block", undefined, undefined],
    ["address", "1234567", "1234567"],
    ["tx", "0xabc", "0xabc"],
  ])("%s and %j give %j", (subdirectory, value, expected) => {
    expect(getChainExplorerLinkText(subdirectory, value)).toBe(expected);
  });
});
