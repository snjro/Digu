import type { JsonFileContract } from "@constants/chains/jsonFileTypes";
import type { Contract, Version } from "@constants/chains/types";
import AMMFactory from "./AMMFactory.json";
import BalancerFactory from "./BalancerFactory.json";
import CryptoMarketFactory from "./CryptoMarketFactory.json";
import FeePot from "./FeePot.json";
import MMALinkMarketFactory from "./MMALinkMarketFactory.json";
import PriceFeedBTC from "./PriceFeedBTC.json";
import PriceFeedDOT from "./PriceFeedDOT.json";
import PriceFeedETH from "./PriceFeedETH.json";
import PriceFeedMATIC from "./PriceFeedMATIC.json";
import ReputationToken from "./ReputationToken.json";
import SportsLinkMarketFactory from "./SportsLinkMarketFactory.json";
import SportsLinkProxy from "./SportsLinkProxy.json";
import TrustedMarketFactory from "./TrustedMarketFactory.json";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
const contracts: Contract[] = convertJsonFilesContractToContracts([
  AMMFactory,
  BalancerFactory,
  CryptoMarketFactory,
  FeePot,
  MMALinkMarketFactory,
  PriceFeedBTC,
  PriceFeedDOT,
  PriceFeedETH,
  PriceFeedMATIC,
  ReputationToken,
  SportsLinkMarketFactory,
  SportsLinkProxy,
  TrustedMarketFactory,
] as JsonFileContract[]);

export const version: Version = {
  name: "turbo",
  contracts: contracts,
};
