import type {
  Chain,
  ChainName,
  Contract,
  EventAbiFragment,
} from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import type { EthersEventLog, NodeStatus } from "@db/dbTypes";
import { customLogger } from "./logger";
import { getUrlObject } from "./utilsCommon";
import {
  JsonRpcProvider,
  Network,
  WebSocketProvider,
  type Contract as EthersContract,
  type EventLog,
  type Log,
  type JsonRpcApiProviderOptions,
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
  targetChain: Chain,
  rpc: string,
): Promise<NodeProvider | undefined> {
  const httpProtocols: string[] = ["http:", "https:"];
  const webSoketProtocols: string[] = ["ws:", "wss:"];
  const url: URL | undefined = getUrlObject(rpc);

  let nodeProvider: NodeProvider | undefined = undefined;
  let nodeStatus: NodeStatus = "CONNECTING";
  await updateDbItemChainStatus(targetChain.name, "nodeStatus", nodeStatus);
  if (url === undefined) {
    nodeStatus = "INVALID_URL";
  } else if ([...httpProtocols, ...webSoketProtocols].includes(url.protocol)) {
    const targetNetwork: Network = Network.from(targetChain.chainId);
    if (httpProtocols.includes(url.protocol)) {
      // add the options to avoid the error `Too many eth_getLogs methods in the batch`
      // ref: https://github.com/ethers-io/ethers.js/discussions/4130#discussioncomment-6126545
      const jsonRpcApiProviderOptions: JsonRpcApiProviderOptions = {
        batchMaxSize: 1,
        staticNetwork: targetNetwork,
      };
      nodeProvider = new JsonRpcProvider(
        rpc,
        undefined,
        jsonRpcApiProviderOptions,
      );
    } else {
      nodeProvider = new WebSocketProvider(rpc, targetNetwork);
    }
    try {
      const providedNetwork: Network = await nodeProvider.getNetwork();
      if (providedNetwork.chainId === targetNetwork.chainId) {
        nodeStatus = "SUCCESS";
        customLogger.success("nodeProvider.getNetwork().", {
          network: providedNetwork,
          options: {
            batchMaxCount: nodeProvider._getOption("batchMaxCount"),
            batchMaxSize: nodeProvider._getOption("batchMaxSize"),
            batchStallTime: nodeProvider._getOption("batchStallTime"),
            cacheTimeout: nodeProvider._getOption("cacheTimeout"),
            polling: nodeProvider._getOption("polling"),
            pollingInterval: nodeProvider._getOption("pollingInterval"),
            staticNetwork: nodeProvider._getOption("staticNetwork"),
          },
        });
      } else {
        nodeStatus = "WRONG_CHAIN";
      }
    } catch (error) {
      customLogger.error("nodeProvider.getNetwork().", error);
      nodeStatus = "NETWORK_ERROR";
    }
  } else {
    customLogger.error(
      `protocol should be [http / https / ws / wss]. RPC:`,
      rpc,
    );
    nodeStatus = "INVALID_PROTOCOL";
  }
  await updateDbItemChainStatus(targetChain.name, "nodeStatus", nodeStatus);
  return nodeStatus === "SUCCESS" ? nodeProvider : undefined;
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
    ethersEventLogs = ethersEventLogs.concat(fetchedEthersEventLogs);
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
  return ethersEventLog as EthersEventLog[];
}
