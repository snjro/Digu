// eth Augur version2 at v1.1.2 (EventLog DB version 1): the event contracts of src/constants/chains/ethereum-mainnet/augur/version2/ and the rows of src/db/dbEventLogsAddInitialData.ts.
import type { SchemaDefinition } from "./dbTypes";

const contracts: [
  name: string,
  creationBlockNumber: number,
  eventNames: string[],
][] = [
  [
    "Augur",
    10543755,
    [
      "CompleteSetsPurchased",
      "CompleteSetsSold",
      "DesignatedReportStakeChanged",
      "DisputeCrowdsourcerCompleted",
      "DisputeCrowdsourcerContribution",
      "DisputeCrowdsourcerCreated",
      "DisputeCrowdsourcerRedeemed",
      "DisputeWindowCreated",
      "FinishDeployment",
      "InitialReportSubmitted",
      "InitialReporterRedeemed",
      "InitialReporterTransferred",
      "MarketCreated",
      "MarketFinalized",
      "MarketMigrated",
      "MarketOIChanged",
      "MarketParticipantsDisavowed",
      "MarketRepBondTransferred",
      "MarketTransferred",
      "NoShowBondChanged",
      "ParticipationTokensRedeemed",
      "RegisterContract",
      "ReportingFeeChanged",
      "ReportingParticipantDisavowed",
      "ShareTokenBalanceChanged",
      "TimestampSet",
      "TokenBalanceChanged",
      "TokensBurned",
      "TokensMinted",
      "TokensTransferred",
      "TradingProceedsClaimed",
      "UniverseCreated",
      "UniverseForked",
      "ValidityBondChanged",
      "WarpSyncDataUpdated",
    ],
  ],
  [
    "AugurTrading",
    10543759,
    [
      "CancelZeroXOrder",
      "MarketVolumeChanged",
      "OrderEvent",
      "ProfitLossChanged",
    ],
  ],
  [
    "AugurWalletRegistry",
    10543783,
    ["ExecuteTransactionStatus", "RelayHubChanged"],
  ],
  [
    "AugurWalletRegistryV2",
    10543786,
    ["ExecuteTransactionStatus", "RequestTypeRegistered"],
  ],
  ["Cash", 8928158, ["Approval", "Transfer"]],
  [
    "Exchange",
    8952139,
    [
      "AssetProxyRegistered",
      "Cancel",
      "CancelUpTo",
      "Fill",
      "OwnershipTransferred",
      "ProtocolFeeCollectorAddress",
      "ProtocolFeeMultiplier",
      "SignatureValidatorApproval",
      "TransactionExecution",
    ],
  ],
  ["LegacyReputationToken", 5926311, ["Approval", "FundedAccount", "Transfer"]],
  ["OICash", 10544033, ["Approval", "Transfer"]],
  ["REPv2", 10544033, ["Approval", "Transfer"]],
  [
    "RelayHubV2",
    10498576,
    [
      "Deposited",
      "Penalized",
      "RelayServerRegistered",
      "RelayWorkersAdded",
      "TransactionRejectedByPaymaster",
      "TransactionRelayed",
      "Withdrawn",
    ],
  ],
  [
    "ShareToken",
    10543897,
    ["ApprovalForAll", "TransferBatch", "TransferSingle", "URI"],
  ],
  [
    "USDT",
    4634748,
    [
      "AddedBlackList",
      "Approval",
      "Deprecate",
      "DestroyedBlackFunds",
      "Issue",
      "Params",
      "Pause",
      "Redeem",
      "RemovedBlackList",
      "Transfer",
      "Unpause",
    ],
  ],
  ["UniswapV2Factory", 10000835, ["PairCreated"]],
  [
    "UniswapV2Pair",
    10042267,
    ["Approval", "Burn", "Mint", "Swap", "Sync", "Transfer"],
  ],
  ["WETH9", 4719568, ["Approval", "Deposit", "Transfer", "Withdrawal"]],
  [
    "ZeroXTrade",
    10543931,
    ["ApprovalForAll", "TransferBatch", "TransferSingle", "URI"],
  ],
];

export const schemaVersion1: SchemaDefinition = { SyncStatus: "name" };
for (const [name, , eventNames] of contracts) {
  for (const eventName of eventNames) {
    schemaVersion1[`${name}_${eventName}`] = "++id";
  }
}

export const syncStatusesVersion1 = contracts.map(
  ([name, creationBlockNumber, eventNames]) => ({
    name,
    isSyncTarget: true,
    isSyncing: false,
    isAbort: false,
    fetchedBlockNumber: creationBlockNumber,
    creationBlockNumber,
    numOfSyncTargetContract: 1,
    syncStateText: "-",
    subSyncStatuses: null,
    events: Object.fromEntries(
      eventNames.map((eventName) => [eventName, { recordCount: 0 }]),
    ),
  }),
);
