import type { Chain } from "./types";

import { chain as ethereumMainnet } from "./ethereum-mainnet/_index";

export const TARGET_CHAINS: Chain[] = [ethereumMainnet];
