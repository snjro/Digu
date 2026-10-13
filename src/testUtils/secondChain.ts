import type { Chain } from "#constants/chains/types.js";

// Digu has one chain. A test that checks that one chain leaves the others
// alone mocks TARGET_CHAINS with a copy of the first chain under this name:
//   vi.mock("#constants/chains/_index.js", async (importOriginal) =>
//     (await import("<path>/testUtils/secondChain")).withSecondChain(
//       importOriginal,
//     ),
//   );
export const SECOND_CHAIN_NAME = "chain2";

export async function withSecondChain(
  importOriginal: () => Promise<{ TARGET_CHAINS: Chain[] }>,
): Promise<{ TARGET_CHAINS: Chain[] }> {
  const { TARGET_CHAINS } = await importOriginal();
  return {
    TARGET_CHAINS: [
      ...TARGET_CHAINS,
      { ...TARGET_CHAINS[0], name: SECOND_CHAIN_NAME },
    ],
  };
}
