import type { Chain } from "@constants/chains/types";
import { project as augur } from "./augur/_index";

export const chain: Chain = {
  name: "matic",
  fullName: "Polygon Mainnet",
  chain: "Polygon",
  faucets: [],
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  infoURL: "https://polygon.technology/",
  shortName: "MATIC",
  chainId: 137,
  networkId: 137,
  slip44: 966,
  chainExplorers: [
    {
      name: "polygonscan",
      url: "https://polygonscan.com",
      subdirectory: { address: "address", tx: "tx", block: "block" },
    },
  ],
  blockIntervalMs: 2000,
  tryCount: 10,
  projects: [augur],
};

// The original JSON file is https://chainid.network/chains.json
