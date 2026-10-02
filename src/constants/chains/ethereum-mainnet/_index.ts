import type { Chain } from "@constants/chains/types";
import { project as augur } from "./augur/_index";

export const chain: Chain = {
  name: "eth",
  fullName: "Ethereum Mainnet",
  chain: "ETH",
  icon: "ethereum",
  faucets: [],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  infoURL: "https://ethereum.org",
  shortName: "eth",
  chainId: 1,
  networkId: 1,
  slip44: 60,
  ens: { registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" },
  chainExplorer: {
    name: "Etherscan",
    url: "https://etherscan.io",
    subdirectory: { address: "address", tx: "tx", block: "block" },
  },
  blockIntervalMs: 20000,
  confirmationBlocks: 96,
  projects: [augur],
};

// The original JSON file is https://chainid.network/chains.json
