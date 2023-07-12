import type { Chain } from "@constants/chains/types";
import { project as augur } from "./augur/_index";

export const chain: Chain = {
  name: "mumbai",
  fullName: "Polygon Testnet Mumbai",
  chain: "Polygon",
  rpc: [
    "https://matic-mumbai.chainstacklabs.com",
    "https://rpc-mumbai.maticvigil.com",
    "https://matic-testnet-archive-rpc.bwarelabs.com",
  ],
  faucets: ["https://faucet.polygon.technology/"],
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  infoURL: "https://polygon.technology/",
  shortName: "maticmum",
  chainId: 80001,
  networkId: 80001,
  chainExplorers: [
    {
      name: "polygonscan",
      url: "https://mumbai.polygonscan.com",
      subdirectory: { address: "address", tx: "tx", block: "block" },
    },
  ],
  blockIntervalMs: 2000,
  tryCount: 10,
  abortWatchIntervalMs: 5000,
  projects: [augur],
};

// The original JSON file is https://chainid.network/chains.json
