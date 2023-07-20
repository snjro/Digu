import type {
  Chain,
  ChainName,
  Contract,
  EventAbiFragment,
} from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import type { EthersEventLog, NodeStatus } from "@db/dbTypes";
import { myLogger } from "./logger";
import { getUrlObject } from "./utilsCommon";
import { getTargetChain } from "./utlisDb";
import { get } from "svelte/store";
import { storeUserSettings } from "@stores/storeUserSettings";
import {
  JsonRpcProvider,
  Network,
  WebSocketProvider,
  Contract as EthersContract,
  EventLog,
  Log,
} from "ethers";
export type AbiFormatType = "json" | "full" | "minimal";

export function extractEventContracts(targetContracts: Contract[]): Contract[] {
  const eventContracts: Contract[] = targetContracts.filter(
    (contract: Contract) => {
      return contract.events.abiFragments.length > 0 ? true : false;
    },
  );
  return eventContracts;
}
export type NodeProvider = JsonRpcProvider | WebSocketProvider;

export async function getNodeProvider(
  chainName: ChainName,
  rpc: string,
): Promise<NodeProvider | undefined> {
  const httpProtocols: string[] = ["http:", "https:"];
  const webSoketProtocols: string[] = ["ws:", "wss:"];
  const url: URL | undefined = getUrlObject(rpc);
  let nodeProvider: NodeProvider | undefined = undefined;
  let nodeStatus: NodeStatus = "CONNECTING";
  await updateDbItemChainStatus(chainName, "nodeStatus", nodeStatus);
  if (url === undefined) {
    nodeStatus = "INVALID_URL";
  } else if ([...httpProtocols, ...webSoketProtocols].includes(url.protocol)) {
    if (httpProtocols.includes(url.protocol)) {
      nodeProvider = new JsonRpcProvider(rpc);
    } else {
      nodeProvider = new WebSocketProvider(rpc);
    }
    try {
      const targetChain: Chain = getTargetChain({
        chainName: get(storeUserSettings).selectedChainName.toString(),
      });
      const network: Network = await nodeProvider.getNetwork();
      if (network.chainId === BigInt(targetChain.chainId)) {
        nodeStatus = "SUCCESS";
      } else {
        nodeStatus = "WRONG_CHAIN";
      }
    } catch (error) {
      myLogger.error("nodeProvider.getNetwork() is failed.", error);
      nodeStatus = "NETWORK_ERROR";
    }
  } else {
    myLogger.error(`protocol should be [http / https / ws / wss]. RPC:`, rpc);
    nodeStatus = "INVALID_PROTOCOL";
  }
  await updateDbItemChainStatus(chainName, "nodeStatus", nodeStatus);
  return nodeProvider;
}
export async function getAndUpdateLatestBlockNumber(
  nodeProvider: NodeProvider,
  chainName: ChainName,
): Promise<number> {
  const latestBlockNumber: number = await nodeProvider.getBlockNumber();
  await updateDbItemChainStatus(
    chainName,
    "latestBlockNumber",
    latestBlockNumber,
  );
  return latestBlockNumber;
}

export async function getEthersEventLogs(
  eventNames: EventAbiFragment["name"][],
  ethersContract: EthersContract,
  fromBlock: number,
  toBLock: number,
): Promise<EthersEventLog[]> {
  let ethersEventLogs: EthersEventLog[] = [];
  for (const eventName of eventNames) {
    const fetchedEthersEventLogs: EthersEventLog[] = await queryFilter(
      ethersContract,
      eventName,
      fromBlock,
      toBLock,
    );
    ethersEventLogs.concat(fetchedEthersEventLogs);
  }
  return ethersEventLogs;
}

async function queryFilter(
  ethersContract: EthersContract,
  eventName: string,
  fromBlock: number,
  toBLock: number,
): Promise<EthersEventLog[]> {
  let ethersEventLog: Array<EventLog | Log> = await ethersContract.queryFilter(
    eventName,
    fromBlock,
    toBLock,
  );
  if (isEventLogs(ethersEventLog)) {
    return ethersEventLog;
  } else {
    return [];
  }
}
function isEventLogs(
  eventLogs: Array<EventLog | Log>,
): eventLogs is Array<EventLog> {
  let eventLog: EventLog | Log;
  for (eventLog of eventLogs) {
    if (!eventLog.hasOwnProperty("args")) {
      return false;
    }
  }
  return true;
}
