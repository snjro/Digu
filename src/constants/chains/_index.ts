import type { Chain } from "./types";
import { chain as matic } from "./matic/_index";

// export const TARGET_CHAINS: Chain[] = [matic];

// import { chain as mumbai } from "./mumbai/_index";

import { chain as ethereumMainnet } from "./ethereum-mainnet/_index";

export const TARGET_CHAINS: Chain[] = [ethereumMainnet, matic];
// export const TARGET_CHAINS: Chain[] = [ethereumMainnet];
