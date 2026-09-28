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
import { getTargetChain } from "./utilsDb";
import {
  JsonRpcProvider,
  Network,
  WebSocketProvider,
  EventLog,
  getNumber,
  isHexString,
  type Contract as EthersContract,
  type Log,
  type LogParams,
  type JsonRpcApiProviderOptions,
} from "ethers";
export type AbiFormatType = "json" | "full" | "minimal";

// Anonymous events are not synced, so a contract that has only anonymous
// events has no event to sync. Neither has a contract with "syncEvents": false.
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

// The blockTimestamp that an RPC may put in each log, by block number, for
// each provider. ethers does not keep it in a Log.
const blockTimestampsOfProviders: WeakMap<
  NodeProvider,
  Map<number, number>
> = new WeakMap();
function keepBlockTimestamp(provider: NodeProvider, log: LogParams): void {
  // The raw log from the RPC, which ethers types as LogParams.
  const blockTimestamp: unknown = (log as { blockTimestamp?: unknown })
    .blockTimestamp;
  if (!isHexString(blockTimestamp)) {
    return;
  }
  let blockTimestamps: Map<number, number> | undefined =
    blockTimestampsOfProviders.get(provider);
  if (blockTimestamps === undefined) {
    blockTimestamps = new Map();
    blockTimestampsOfProviders.set(provider, blockTimestamps);
  }
  blockTimestamps.set(getNumber(log.blockNumber), getNumber(blockTimestamp));
}
// The blockTimestamp of a log that this provider has returned, if any.
export function getBlockTimestampFromLogs(
  provider: NodeProvider,
  blockNumber: number,
): number | undefined {
  return blockTimestampsOfProviders.get(provider)?.get(blockNumber);
}
// ethers calls _wrapLog with each log of eth_getLogs.
class JsonRpcProviderKeepingBlockTimestamps extends JsonRpcProvider {
  override _wrapLog(value: LogParams, network: Network): Log {
    keepBlockTimestamp(this, value);
    return super._wrapLog(value, network);
  }
}
class WebSocketProviderKeepingBlockTimestamps extends WebSocketProvider {
  override _wrapLog(value: LogParams, network: Network): Log {
    keepBlockTimestamp(this, value);
    return super._wrapLog(value, network);
  }
}

// The number of the latest call for each chain, so that an earlier call that
// ends last does not overwrite the node status of a later one.
const latestNodeProviderCalls: Record<ChainName, number> = {};

// A WebSocket that never opens makes getNetwork wait forever.
const GET_NETWORK_TIMEOUT_MS: number = 10000;

// Returns the provider when this call succeeds, even if a newer call ran.
export async function getNodeProvider(
  targetChain: Chain,
  rpc: string,
): Promise<NodeProvider | undefined> {
  const callNumber: number =
    (latestNodeProviderCalls[targetChain.name] ?? 0) + 1;
  latestNodeProviderCalls[targetChain.name] = callNumber;
  const httpProtocols: string[] = ["http:", "https:"];
  const webSocketProtocols: string[] = ["ws:", "wss:"];
  const url: URL | undefined = getUrlObject(rpc);

  let nodeProvider: NodeProvider | undefined = undefined;
  let nodeStatus: NodeStatus = "CONNECTING";
  await updateDbItemChainStatus(targetChain.name, "nodeStatus", nodeStatus);
  if (url === undefined) {
    nodeStatus = "INVALID_URL";
  } else if ([...httpProtocols, ...webSocketProtocols].includes(url.protocol)) {
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
        nodeProvider = new JsonRpcProviderKeepingBlockTimestamps(
          rpc,
          undefined,
          jsonRpcApiProviderOptions,
        );
      } else {
        // It opens the socket at once, and that can throw.
        nodeProvider = new WebSocketProviderKeepingBlockTimestamps(rpc);
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
  // Blocks within the confirmation depth can still be replaced by a chain
  // reorganization, so the sync does not go past them.
  const latestBlockNumber: number = Math.max(
    0,
    (await nodeProvider.getBlockNumber()) -
      getTargetChain({ chainName }).confirmationBlocks,
  );
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
  // An empty OR list would match all the logs of the address.
  if (eventNames.length === 0) {
    return [];
  }
  return await queryFilter(ethersContract, eventNames, fromBlock, toBlock);
}

// One eth_getLogs for all the events: the nested array is an OR on topic 0,
// and ethers decodes each log with the event of its topic 0.
async function queryFilter(
  ethersContract: EthersContract,
  eventNames: string[],
  fromBlock: number,
  toBlock: number,
): Promise<EthersEventLog[]> {
  const logs: Array<EventLog | Log> = await ethersContract.queryFilter(
    [eventNames],
    fromBlock,
    toBlock,
  );
  return extractDecodedEventLogs(logs);
}

// Logs that could not be decoded (e.g. "UndecodedEventLog") are skipped
// so that they are not registered under a wrong event name.
export function extractDecodedEventLogs(
  logs: Array<EventLog | Log>,
): EthersEventLog[] {
  const decodedEventLogs: EthersEventLog[] = [];
  for (const log of logs) {
    if (log instanceof EventLog) {
      decodedEventLogs.push(log);
    } else {
      customLogger.error("Skip an event log that could not be decoded.", {
        topic0: log.topics[0],
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
      });
    }
  }
  return decodedEventLogs;
}
