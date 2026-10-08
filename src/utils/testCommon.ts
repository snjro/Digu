import type { JsonFileContract } from "#constants/chains/jsonFileTypes.js";
import type { Readable } from "svelte/store";
import { vi } from "vitest";
import {
  FetchRequest,
  JsonRpcProvider,
  makeError,
  Network,
  toUtf8Bytes,
  toUtf8String,
  type GetUrlResponse,
  type JsonRpcPayload,
} from "ethers";

// An ethers error of an RPC that refused the key, with the RPC URL in its
// request, its info and its error.
export function makeEthersErrorWithRpcUrl(): Error {
  return makeError("server response 401 Unauthorized", "SERVER_ERROR", {
    request: new FetchRequest("https://rpc.example/secret-key"),
    error: new Error("https://rpc.example/secret-key"),
    info: {
      requestUrl: "https://rpc.example/secret-key",
      responseBody: "invalid key",
    },
  });
}
// What of that error may be logged.
export const LOGGABLE_ETHERS_ERROR = {
  code: "SERVER_ERROR",
  shortMessage: "server response 401 Unauthorized",
};

const jsonFileContract1EventOnly: JsonFileContract = {
  name: "contractName1",
  address: "0x11",
  creation: {
    tx: "0x12",
    blockNumber: 1,
    timestamp: 1,
    creator: "0x13",
  },
  abi: [
    {
      name: "event1",
      type: "event",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};
const jsonFileContract2FunctionOnly: JsonFileContract = {
  name: "contractName2",
  address: "0x21",
  creation: {
    tx: "0x22",
    blockNumber: 2,
    timestamp: 2,
    creator: "0x23",
  },
  abi: [
    {
      name: "function1",
      type: "function",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};
const jsonFileContract3FunctionOnly: JsonFileContract = {
  name: "contractName3",
  address: "0x31",
  creation: {
    tx: "0x32",
    blockNumber: 3,
    timestamp: 3,
    creator: "0x33",
  },
  abi: [
    {
      name: "function1",
      type: "function",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};

export const jsonFileContracts: JsonFileContract[] = [
  jsonFileContract1EventOnly,
  jsonFileContract2FunctionOnly,
  jsonFileContract3FunctionOnly,
];

// Counts the subscriptions of a store that have not been unsubscribed yet.
export function trackStoreSubscriptions<T>(store: Readable<T>): {
  countActive: () => number;
  restore: () => void;
} {
  let numOfActive: number = 0;
  const originalSubscribe = store.subscribe;
  const spySubscribe = vi
    .spyOn(store, "subscribe")
    .mockImplementation((...args: Parameters<Readable<T>["subscribe"]>) => {
      numOfActive++;
      const unsubscribe = originalSubscribe(...args);
      return () => {
        numOfActive--;
        unsubscribe();
      };
    });
  return {
    countActive: () => numOfActive,
    restore: () => spySubscribe.mockRestore(),
  };
}

// The answer of the RPC to an eth_getLogs request: an HTTP status other than
// 200, the message of a JSON-RPC error with HTTP 200, or no logs (undefined).
export type GetLogsAnswer = number | string | undefined;
// A real ethers provider over a fake HTTP connection, so that ethers makes the
// errors as for a real RPC. answer is called for each eth_getLogs request with
// its number (the first request is 1).
export function providerAnsweringGetLogs(
  chainId: number,
  answer: (requestNumber: number) => GetLogsAnswer,
): {
  provider: JsonRpcProvider;
  // [fromBlock, toBlock] of each eth_getLogs request.
  getLogsRanges: () => number[][];
} {
  const network: Network = Network.from(chainId);
  const request: FetchRequest = new FetchRequest("http://fake-rpc.invalid/");
  const getLogsRanges: number[][] = [];
  request.getUrlFunc = async (req: FetchRequest): Promise<GetUrlResponse> => {
    const payload = JSON.parse(toUtf8String(req.body!)) as JsonRpcPayload;
    if (payload.method !== "eth_getLogs") {
      throw new Error(`unexpected method: ${payload.method}`);
    }
    const { fromBlock, toBlock } = (
      payload.params as [{ fromBlock: string; toBlock: string }]
    )[0];
    getLogsRanges.push([Number(fromBlock), Number(toBlock)]);
    const result: GetLogsAnswer = answer(getLogsRanges.length);
    const statusCode: number = typeof result === "number" ? result : 200;
    const body: object =
      result === undefined
        ? { jsonrpc: "2.0", id: payload.id, result: [] }
        : {
            jsonrpc: "2.0",
            id: payload.id,
            error: {
              code: -32000,
              message: typeof result === "string" ? result : "fake error",
            },
          };
    return {
      statusCode,
      statusMessage: statusCode === 200 ? "OK" : "Fake Error",
      headers: {},
      body: toUtf8Bytes(JSON.stringify(body)),
    };
  };
  const provider = new JsonRpcProvider(request, network, {
    staticNetwork: network,
    batchMaxSize: 1,
  });
  return { provider, getLogsRanges: () => getLogsRanges };
}
