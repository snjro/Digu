import { describe, expect, test } from "vitest";
import { TARGET_CHAINS } from "@constants/chains/_index";
import { initialDataRpcSetting } from "@db/dbTypes";
import type { StateRpcSettings } from "@stores/storeTypes";
import { TargetNotFoundError } from "@utils/utilsDb";
import {
  getChainExplorer,
  getChainExplorerHref,
  getChainExplorerLinkText,
  type CommonChainExplorerLinkProps,
} from "./chainExplorerLink";
import type { ChainExplorer } from "@constants/chains/types";

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

describe("getChainExplorer", () => {
  test.each(
    TARGET_CHAINS.flatMap((targetChain) =>
      targetChain.chainExplorers.map(
        (chainExplorer, index) =>
          [targetChain.name, index, chainExplorer] as const,
      ),
    ),
  )("chain %j with explorer %i", (chainName, index, expected) => {
    expect(getChainExplorer(chainName, rpcSettings(index))).toBe(expected);
  });
  test("an unknown chain throws", () => {
    expect(() => getChainExplorer("unknown", rpcSettings(0))).toThrow(
      TargetNotFoundError,
    );
  });
});

const etherscan: ChainExplorer = {
  name: "Etherscan",
  url: "https://etherscan.io",
  subdirectory: { address: "address", tx: "tx", block: "block" },
};
const blockchair: ChainExplorer = {
  name: "Blockchair",
  url: "https://blockchair.com/ethereum",
  subdirectory: { address: "address", tx: "transaction", block: "block" },
};

describe("getChainExplorerHref", () => {
  test.each<
    [
      ChainExplorer,
      CommonChainExplorerLinkProps["subdirectory"],
      CommonChainExplorerLinkProps["value"],
      string,
    ]
  >([
    [etherscan, "address", "0xabc", "https://etherscan.io/address/0xabc"],
    [etherscan, "tx", "0xdef", "https://etherscan.io/tx/0xdef"],
    [etherscan, "block", "1234567", "https://etherscan.io/block/1234567"],
    [etherscan, "block", undefined, "https://etherscan.io/block/undefined"],
    [
      blockchair,
      "address",
      "0xabc",
      "https://blockchair.com/ethereum/address/0xabc",
    ],
    [
      blockchair,
      "tx",
      "0xdef",
      "https://blockchair.com/ethereum/transaction/0xdef",
    ],
    [
      blockchair,
      "block",
      "1234567",
      "https://blockchair.com/ethereum/block/1234567",
    ],
  ])("%# %s and %j give %j", (chainExplorer, subdirectory, value, expected) => {
    expect(getChainExplorerHref(chainExplorer, subdirectory, value)).toBe(
      expected,
    );
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
