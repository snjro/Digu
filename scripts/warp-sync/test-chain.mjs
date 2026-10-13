// For the tests of the scripts: a chain that only the tests have. It has six
// contracts with events of eth under other creation blocks, so that a build
// fetches few blocks. Not eth: MAX_WIDTHS has eth. Mock chains.mjs with it:
//   vi.mock("./chains.mjs", async (importOriginal) =>
//     (await import("./test-chain.mjs")).withTestChain(await importOriginal()),
//   );
export const TEST_CHAIN_NAME = "test";
export const TEST_CHAIN_ID = 999;
const CONTRACTS = [
  ["LegacyReputationToken", 15_336_699],
  ["AugurWalletRegistry", 14_852_456],
  ["OICash", 14_853_221],
  ["REPv2", 15_336_696],
  ["ShareToken", 14_853_218],
  ["ZeroXTrade", 15_336_692],
];

// The module of chains.mjs whose loadChain also reads the test chain.
// original is the real module.
export function withTestChain(original) {
  return {
    ...original,
    loadChain(chainName, chainsDir) {
      if (chainName !== TEST_CHAIN_NAME || chainsDir !== undefined) {
        return original.loadChain(chainName, chainsDir);
      }
      const eth = original.loadChain("eth");
      return {
        name: TEST_CHAIN_NAME,
        chainId: TEST_CHAIN_ID,
        confirmationBlocks: 128,
        contracts: CONTRACTS.map(([name, creationBlock]) => ({
          ...eth.contracts.find(
            (contract) =>
              contract.version === "version2" && contract.name === name,
          ),
          creationBlock,
        })),
      };
    },
  };
}
