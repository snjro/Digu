import type {
  ChainName,
  ProjectName,
  VersionName,
  ContractName,
  AbiFragmentName,
  HexString,
  ContractInterface,
  Chain,
} from "@constants/chains/types";
import type { NO_DATA } from "@utils/utilsCostants";
import type { EventLog as OriginalEthersEventLog } from "ethers";
import type { HTMLInputTypeAttribute } from "svelte/elements";

export type SchemaDefinition = {
  [key: string]: string;
};
/////////////////////////////////////////////////////////
export type ChainIdentifier = {
  readonly chainName: ChainName;
};
export type ProjectIdentifier = ChainIdentifier & {
  readonly projectName: ProjectName;
};
export type VersionIdentifier = ProjectIdentifier & {
  readonly versionName: VersionName;
};
export type ContractIdentifier = VersionIdentifier & {
  readonly contractName: ContractName;
};
export type AbiFragmentIdentifier = ContractIdentifier & {
  readonly abiFragmentName: AbiFragmentName;
  // ↓ value is set only if abiFragment is function (if event, it is set "undefined")
  readonly functionSelector?: HexString;
};
/////////////////////////////////////////////////////////
export type BlockTime = {
  blockNumber: number;
  timestamp: number;
  isoDatetime: string;
};

/////////////////////////////////////////////////////////
export type RpcInputType = Extract<HTMLInputTypeAttribute, "text" | "password">;
export type RpcSetting = {
  chainName: ChainName;
  rpc: string;
  bulkUnit: number;
  chainExplorerIndex: number;
  blockIntervalMs: number;
  tryCount: number;
  abortWatchIntervalMs: number;
  inputType: RpcInputType;
};
export const initialDataRpcSetting = (targetChain: Chain): RpcSetting => {
  return {
    chainName: targetChain.name,
    rpc:
      targetChain.rpc && targetChain.rpc.length > 0 ? targetChain.rpc[0] : "",
    bulkUnit: 1000,
    chainExplorerIndex: 0,
    blockIntervalMs: targetChain.blockIntervalMs,
    tryCount: targetChain.tryCount,
    abortWatchIntervalMs: targetChain.abortWatchIntervalMs,
    inputType: "text",
  };
};

export type ThemeColor = "dark" | "light";
export type UserSetting = {
  userSettingsId: "userSetting01";
  themeColor: ThemeColor;
  devMode: boolean;
  selectedChainName: ChainName;
  isOpenSidebar: boolean;
};
export const initialDataUserSettings = (): UserSetting => {
  return {
    userSettingsId: "userSetting01",
    themeColor: "light",
    devMode: false,
    selectedChainName: "eth",
    isOpenSidebar: true,
  };
};
/////////////////////////////////////////////////////////
export type NodeStatus =
  | "SUCCESS"
  | "CONNECTING"
  | "INVALID_URL"
  | "INVALID_PROTOCOL"
  | "NETWORK_ERROR"
  | "WRONG_CHAIN"
  | undefined;

export type ChainStatus = {
  chainName: ChainName;
  latestBlockNumber: number;
  nodeStatus: NodeStatus;
};

/////////////////////////////////////////////////////////
export type IdentifierName =
  | ChainName
  | ProjectName
  | VersionName
  | ContractName;
export type SyncStatus =
  | SyncStatusChain
  | SyncStatusProject
  | SyncStatusVersion
  | SyncStatusContract;
export type SubSyncStatus =
  | SyncStatusProject
  | SyncStatusVersion
  | SyncStatusContract;

export type SubSyncStatuses =
  | SyncStatusesProject
  | SyncStatusesVersion
  | SyncStatusesContract
  | null;

//=====chain=====
export type SyncStatusesChain = {
  [key in ChainName]: SyncStatusChain;
};
export type SyncStatusChain = SyncStatusBase<ChainName, SyncStatusesProject>;
//=====project=====
export type SyncStatusesProject = {
  [key in ProjectName]: SyncStatusProject;
};
export type SyncStatusProject = SyncStatusBase<
  ProjectName,
  SyncStatusesVersion
>;
//=====version=====
export type SyncStatusesVersion = {
  [key in VersionName]: SyncStatusVersion;
};
export type SyncStatusVersion = SyncStatusBase<
  VersionName,
  SyncStatusesContract
>;
//=====contract=====
export type SyncStatusesContract = {
  [key in ContractName]: SyncStatusContract;
};
export type SyncStatusContract = SyncStatusBase<ContractName, null> & {
  events: SyncStatusesEvent;
};
//=====event=====
export type SyncStatusesEvent = { [key in AbiFragmentName]: SyncStatusEvent };
export type SyncStatusEvent = { recordCount: number };
//=====event log=====
export type EthersEventLog = OriginalEthersEventLog;
export type ConvertedEventLog = {
  eventName: EthersEventLog["eventName"];
  eventSignature: EthersEventLog["eventSignature"];
  args: Array<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  blockNumber: EthersEventLog["blockNumber"];
  jsDate: Date;
  blockHash: HexString;
  data: HexString;
  logIndex: EthersEventLog["index"];
  removed: EthersEventLog["removed"];
  topics: HexString[];
  address: HexString;
  transactionHash: HexString;
  transactionIndex: EthersEventLog["transactionIndex"];
  provider: EthersEventLog["provider"];
  fragment: EthersEventLog["fragment"];
  interface: ContractInterface;
};
export type GroupedEventLogs = {
  [eventName: string]: ConvertedEventLog[];
};

//=====base=====
export const syncStatusBaseNumberKeys = [
  "fetchedBlockNumber",
  "creationBlockNumber",
  "numOfSyncTargetContract",
] as const;
export const syncStatusBaseBooleanKeys = [
  "isAbort",
  "isSyncing",
  "isSyncTarget",
] as const;
type SyncStatusBaseNumberItems = {
  [key in (typeof syncStatusBaseNumberKeys)[number]]: number;
};
type SyncStatusBaseBooleanItems = {
  [key in (typeof syncStatusBaseBooleanKeys)[number]]: boolean;
};
export type SyncStateText = "stopped" | "syncing" | "stopping" | typeof NO_DATA;
type SyncStateTextItems = {
  syncStateText: SyncStateText;
};
export type SyncStatusBase<
  T extends IdentifierName,
  U extends SubSyncStatuses,
> = {
  name: T;
  subSyncStatuses: U;
} & SyncStatusBaseNumberItems &
  SyncStatusBaseBooleanItems &
  SyncStateTextItems;
