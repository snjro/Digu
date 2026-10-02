import AMMFactory from "./AMMFactory.json";
import BalancerFactory from "./BalancerFactory.json";
import FeePot from "./FeePot.json";
import MMALinkMarketFactory from "./MMALinkMarketFactory.json";
import PlaceholderReputationToken from "./PlaceholderReputationToken.json";
import SportsLinkMarketFactory from "./SportsLinkMarketFactory.json";
import type { Contract, Version } from "#constants/chains/types.js";
import type { JsonFileContract } from "#constants/chains/jsonFileTypes.js";
import { convertJsonFilesContractToContracts } from "#constants/chains/convertJsonToABI.js";

const contracts: Contract[] = convertJsonFilesContractToContracts([
  AMMFactory,
  BalancerFactory,
  FeePot,
  MMALinkMarketFactory,
  PlaceholderReputationToken,
  SportsLinkMarketFactory,
] as JsonFileContract[]);
export const version: Version = {
  name: "turbo",
  contracts: contracts,
};
