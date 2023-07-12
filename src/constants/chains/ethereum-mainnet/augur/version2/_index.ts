import type { Contract, Version } from "@constants/chains/types";
import Augur from "./Augur.json";
import LegacyReputationToken from "./LegacyReputationToken.json";
import Cash from "./Cash.json";
import BuyParticipationTokens from "./BuyParticipationTokens.json";
import RedeemStake from "./RedeemStake.json";
import WarpSync from "./WarpSync.json";
import ShareToken from "./ShareToken.json";
import HotLoading from "./HotLoading.json";
import UniswapV2Pair from "./UniswapV2Pair.json";
import Affiliates from "./Affiliates.json";
import AffiliateValidator from "./AffiliateValidator.json";
import Exchange from "./Exchange.json";
import Time from "./Time.json";
import AugurTrading from "./AugurTrading.json";
import CancelOrder from "./CancelOrder.json";
import CreateOrder from "./CreateOrder.json";
import FillOrder from "./FillOrder.json";
import Orders from "./Orders.json";
import ProfitLoss from "./ProfitLoss.json";
import REPv2 from "./REPv2.json";
import SimulateTrade from "./SimulateTrade.json";
import Trade from "./Trade.json";
import ZeroXTrade from "./ZeroXTrade.json";
import OICash from "./OICash.json";
import AugurWalletRegistry from "./AugurWalletRegistry.json";
import UniswapV2Factory from "./UniswapV2Factory.json";
import UniswapV2Router02 from "./UniswapV2Router02.json";
import AuditFunds from "./AuditFunds.json";
import WETH9 from "./WETH9.json";
import USDT from "./USDT.json";
import AugurWalletRegistryV2 from "./AugurWalletRegistryV2.json";
import RelayHubV2 from "./RelayHubV2.json";
import AccountLoader from "./AccountLoader.json";
import UniverseGenesis from "./UniverseGenesis.json";
import type { JsonFileContract } from "@constants/chains/jsonFileTypes";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
const contracts: Contract[] = convertJsonFilesContractToContracts([
  Augur,
  LegacyReputationToken,
  Cash,
  BuyParticipationTokens,
  RedeemStake,
  WarpSync,
  ShareToken,
  HotLoading,
  UniswapV2Pair,
  Affiliates,
  AffiliateValidator,
  Exchange,
  Time,
  AugurTrading,
  CancelOrder,
  CreateOrder,
  FillOrder,
  Orders,
  ProfitLoss,
  REPv2,
  SimulateTrade,
  Trade,
  ZeroXTrade,
  OICash,
  AugurWalletRegistry,
  UniswapV2Factory,
  UniswapV2Router02,
  AuditFunds,
  WETH9,
  USDT,
  AugurWalletRegistryV2,
  RelayHubV2,
  AccountLoader,
  UniverseGenesis,
] as JsonFileContract[]);
export const version: Version = {
  name: "version2",
  contracts: contracts,
};
