import type { Contract, Version } from "@constants/chains/types";
import Augur from "./Augur.json";
import LegacyReputationToken from "./LegacyReputationToken.json";
import BuyParticipationTokens from "./BuyParticipationTokens.json";
import RedeemStake from "./RedeemStake.json";
import WarpSync from "./WarpSync.json";
import ShareToken from "./ShareToken.json";
import HotLoading from "./HotLoading.json";
import Affiliates from "./Affiliates.json";
import AffiliateValidator from "./AffiliateValidator.json";
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
import AuditFunds from "./AuditFunds.json";
import AugurWalletRegistryV2 from "./AugurWalletRegistryV2.json";
import AccountLoader from "./AccountLoader.json";
import UniverseGenesis from "./UniverseGenesis.json";
import Universe_Yes_1 from "./Universe_Yes_1.json";
import REPv2_Yes_1 from "./REPv2_Yes_1.json";
import OICash_Yes_1 from "./OICash_Yes_1.json";
import Universe_No_1 from "./Universe_No_1.json";
import REPv2_No_1 from "./REPv2_No_1.json";
import OICash_No_1 from "./OICash_No_1.json";
import type { JsonFileContract } from "@constants/chains/jsonFileTypes";
import { convertJsonFilesContractToContracts } from "@constants/chains/convertJsonToABI";
const contracts: Contract[] = convertJsonFilesContractToContracts([
  Augur,
  LegacyReputationToken,
  BuyParticipationTokens,
  RedeemStake,
  WarpSync,
  ShareToken,
  HotLoading,
  Affiliates,
  AffiliateValidator,
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
  AuditFunds,
  AugurWalletRegistryV2,
  AccountLoader,
  UniverseGenesis,
  // Created by the fork of UniverseGenesis in 2026.
  Universe_Yes_1,
  REPv2_Yes_1,
  OICash_Yes_1,
  Universe_No_1,
  REPv2_No_1,
  OICash_No_1,
] as JsonFileContract[]);
export const version: Version = {
  name: "version2",
  contracts: contracts,
};
