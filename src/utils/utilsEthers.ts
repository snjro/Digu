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
  EventLog,
  type Contract as EthersContract,
  type Log,
  type JsonRpcApiProviderOptions,
} from "ethers";
export type AbiFormatType = "json" | "full" | "minimal";

// Anonymous events are not synced, so a contract that has only anonymous
// events has no event to sync.
export function hasSyncTargetEvents(contract: Contract): boolean {
  return contract.events.names.length > 0;
}
export function extractEventContracts(targetContracts: Contract[]): Contract[] {
  const eventContracts: Contract[] = targetContracts.filter(
    (contract: Contract) => {
      return hasSyncTargetEvents(contract);
    },
  );
  return eventContracts;
}
export type NodeProvider = JsonRpcProvider | WebSocketProvider;

// The number of the latest call for each chain, so that an earlier call that
// ends last does not overwrite the node status of a later one.
const latestNodeProviderCalls: Record<ChainName, number> = {};

// A WebSocket that never opens makes getNetwork wait forever.
const GET_NETWORK_TIMEOUT_MS: number = 10000;

export async function getNodeProvider(
  targetChain: Chain,
  rpc: string,
): Promise<NodeProvider | undefined> {
  const callNumber: number =
    (latestNodeProviderCalls[targetChain.name] ?? 0) + 1;
  latestNodeProviderCalls[targetChain.name] = callNumber;
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
    const timeoutError: Error = new Error("getNetwork timed out.");
    try {
      if (httpProtocols.includes(url.protocol)) {
        // add the options to avoid the error `Too many eth_getLogs methods in the batch`
        // ref: https://github.com/ethers-io/ethers.js/discussions/4130#discussioncomment-6126545
        const jsonRpcApiProviderOptions: JsonRpcApiProviderOptions = {
          batchMaxSize: 1,
          // `true` keeps the chain ID once it is known, instead of asking it for
          // each request. Do not pass targetNetwork: then it is never asked.
          staticNetwork: true,
        };
        nodeProvider = new JsonRpcProvider(
          rpc,
          undefined,
          jsonRpcApiProviderOptions,
        );
      } else {
        // It opens the socket at once, and that can throw.
        nodeProvider = new WebSocketProvider(rpc);
      }
      const providedNetwork: Network = await Promise.race([
        nodeProvider.getNetwork(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(timeoutError),
            GET_NETWORK_TIMEOUT_MS,
          );
        }),
      ]);
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
      const loggableError: unknown = getLoggableError(error);
      customLogger.error(
        "nodeProvider.getNetwork().",
        // Other errors, such as the DOMException of a WebSocket that cannot
        // be made, may have the URL in the message.
        loggableError instanceof Error && loggableError !== timeoutError
          ? { name: loggableError.name }
          : loggableError,
      );
      nodeStatus = "NETWORK_ERROR";
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    customLogger.error(
      `protocol should be [http / https / ws / wss]. RPC host:`,
      url.host,
    );
    nodeStatus = "INVALID_PROTOCOL";
  }
  if (latestNodeProviderCalls[targetChain.name] === callNumber) {
    await updateDbItemChainStatus(targetChain.name, "nodeStatus", nodeStatus);
  }
  if (nodeStatus !== "SUCCESS") {
    await nodeProvider?.destroy();
    return undefined;
  }
  return nodeProvider;
}
// ethers puts the request URL, which may hold an API key, in the message and
// the properties of its errors.
export function getLoggableError(error: unknown): unknown {
  if (!(error instanceof Error && "code" in error && "shortMessage" in error)) {
    return error;
  }
  const loggableError = { code: error.code, shortMessage: error.shortMessage };
  // The error in the JSON-RPC response, which tells why the RPC failed.
  if (
    error.code === "UNKNOWN_ERROR" &&
    "error" in error &&
    isJsonRpcError(error.error)
  ) {
    return {
      ...loggableError,
      rpcError: { code: error.error.code, message: error.error.message },
    };
  }
  return loggableError;
}
function isJsonRpcError(
  value: unknown,
): value is { code: number; message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "number" &&
    "message" in value &&
    typeof value.message === "string"
  );
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
  toBlock: number,
): Promise<EthersEventLog[]> {
  let ethersEventLogs: EthersEventLog[] = [];
  for (const eventName of eventNames) {
    const fetchedEthersEventLogs: EthersEventLog[] = await queryFilter(
      ethersContract,
      eventName,
      fromBlock,
      toBlock,
    );
    ethersEventLogs = ethersEventLogs.concat(fetchedEthersEventLogs);
  }
  return ethersEventLogs;
}

async function queryFilter(
  ethersContract: EthersContract,
  eventName: string,
  fromBlock: number,
  toBlock: number,
): Promise<EthersEventLog[]> {
  const logs: Array<EventLog | Log> = await ethersContract.queryFilter(
    eventName,
    fromBlock,
    toBlock,
  );
  return extractDecodedEventLogs(logs, eventName);
}

// Logs that could not be decoded (e.g. "UndecodedEventLog") are skipped
// so that they are not registered under a wrong event name.
export function extractDecodedEventLogs(
  logs: Array<EventLog | Log>,
  eventName: string,
): EthersEventLog[] {
  const decodedEventLogs: EthersEventLog[] = [];
  for (const log of logs) {
    if (log instanceof EventLog) {
      decodedEventLogs.push(log);
    } else {
      customLogger.error("Skip an event log that could not be decoded.", {
        eventName: eventName,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
      });
    }
  }
  return decodedEventLogs;
}
