import type { Chain } from "@constants/chains/types";
import { project as augur } from "./augur/_index";

export const chain: Chain = {
  name: "matic",
  fullName: "Polygon Mainnet",
  chain: "Polygon",
  rpc: [
    "https://polygon-rpc.com/",
    "https://rpc-mainnet.matic.network",
    "https://matic-mainnet.chainstacklabs.com",
    "https://rpc-mainnet.maticvigil.com",
    "https://rpc-mainnet.matic.quiknode.pro",
    "https://matic-mainnet-full-rpc.bwarelabs.com",
  ],
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
  abortWatchIntervalMs: 5000,
  projects: [augur],
};

// The original JSON file is https://chainid.network/chains.json
