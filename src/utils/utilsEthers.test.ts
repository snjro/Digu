import type { Contract } from "@constants/chains/types";
import { describe, expect, test } from "vitest";
import { extractEventContracts } from "./utilsEthers";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
import {
  jsonFileContract1,
  jsonFileContract2,
  jsonFileContract3,
} from "../../tests/unitTest/utils";

describe("extractEventContracts", () => {
  test("should return contracts that have events", () => {
    const targetContracts: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContract1,
      jsonFileContract2,
    ]);
    const expectedContracts: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContract1,
    ]);
    const actualContracts: Contract[] = extractEventContracts(targetContracts);

    expect(actualContracts).toEqual(expectedContracts);
  });

  test("should return an empty array if no contracts have events", () => {
    const targetContracts: Contract[] = convertJsonFilesContractToContracts([
      jsonFileContract2,
      jsonFileContract3,
    ]);
    const expectedContracts: Contract[] = [];
    const actualContracts: Contract[] = extractEventContracts(targetContracts);

    expect(actualContracts).toEqual(expectedContracts);
  });
});

// describe("getNodeProvider", () => {
//   const targetChain: Chain = TARGET_CHAINS.find(
//     (chain: Chain) => chain.name === "matic",
//   )!;

//   vi.spyOn(
//     dbChainStatusDataHandlers,
//     "updateDbItemChainStatus",
//   ).mockImplementation(vi.fn().mockImplementation(() => {}));

//   vi.mock("ethers");
//   const Ethers = require("ethers");
//   Ethers.mockImplementation(() => {
//     return {
//       method: vi.fn(),
//     };
//   });
//   test("should return a node provider for the specified chain and RPC https", async () => {
//     const rpc: string = "https://polygon-rpc.com";
//     const nodeProvider = await getNodeProvider(targetChain, rpc);
//     expect(nodeProvider).toBeDefined();
//   });

//   test("should return a node provider for the specified chain and RPC wss", async () => {
//     const rpc: string = "wss://rpc-mainnet.matic.network";
//     const nodeProvider = await getNodeProvider(targetChain, rpc);
//     expect(nodeProvider).toBeDefined();
//   });

//   test("should return undefined if the RPC URL is invalid", async () => {
//     const rpc: string = "invalid_url";
//     const nodeProvider = await getNodeProvider(targetChain, rpc);
//     expect(nodeProvider).toBeUndefined();
//   });
// });
