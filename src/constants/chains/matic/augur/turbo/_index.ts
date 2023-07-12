import AMMFactory from "./AMMFactory.json";
import BalancerFactory from "./BalancerFactory.json";
import FeePot from "./FeePot.json";
import MMALinkMarketFactory from "./MMALinkMarketFactory.json";
import PlaceholderReputationToken from "./PlaceholderReputationToken.json";
import SportsLinkMarketFactory from "./SportsLinkMarketFactory.json";
import MaticWETH from "./MaticWETH.json"; //TODO delete
import type { Contract, Version } from "@constants/chains/types";
import type { JsonFileContract } from "@constants/chains/jsonFileTypes";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";

const contracts: Contract[] = convertJsonFilesContractToContracts([
  AMMFactory,
  BalancerFactory,
  FeePot,
  MMALinkMarketFactory,
  PlaceholderReputationToken,
  SportsLinkMarketFactory,
  MaticWETH,
] as JsonFileContract[]);
export const version: Version = {
  name: "turbo",
  contracts: contracts,
};
