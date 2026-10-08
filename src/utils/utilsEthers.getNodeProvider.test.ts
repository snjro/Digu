import type { Chain, ChainName } from "#constants/chains/types.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";
import { getNodeProvider, type NodeProvider } from "./utilsEthers";
import { TARGET_CHAINS } from "#constants/chains/_index.js";
import * as dbChainStatusDataHandlers from "#db/dbChainStatusDataHandlers.js";
import {
  JsonRpcProvider,
  WebSocketProvider,
  isError,
  toQuantity,
  type JsonRpcApiProviderOptions,
  type JsonRpcPayload,
  type JsonRpcResult,
  type Networkish,
  type WebSocketLike,
} from "ethers";

// The fake node that answers the requests instead of the network.
const fakeNode = vi.hoisted(() => ({
  chainId: 0,
  socketOpens: true,
  socketThrows: false,
  answers: true,
  methods: [] as string[],
  // The socket of the last WebSocketProvider, to close it in the tests.
  lastSocket: null as { onclose: (() => void) | null } | null,
}));
function answer(payload: JsonRpcPayload): JsonRpcResult {
  fakeNode.methods.push(payload.method);
  const results: Record<string, unknown> = {
    eth_chainId: toQuantity(fakeNode.chainId),
    eth_blockNumber: "0x1",
    eth_getLogs: [],
  };
  return { id: payload.id, result: results[payload.method] };
}

// The WebSocketProvider made in getNodeProvider uses a fake socket, so that
// the tests do not connect to anywhere.
vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  class FakeSocketWebSocketProvider extends actual.WebSocketProvider {
    constructor(
      _url: string,
      network?: Networkish,
      options?: JsonRpcApiProviderOptions,
    ) {
      super(
        () => {
          if (fakeNode.socketThrows) {
            throw new Error("The socket cannot be made.");
          }
          const socket: WebSocketLike & { onclose: (() => void) | null } = {
            onopen: null,
            onmessage: null,
            onerror: null,
            onclose: null,
            readyState: 0,
            send: (message: string) => {
              if (!fakeNode.answers) {
                return;
              }
              const result = answer(JSON.parse(message));
              queueMicrotask(() =>
                socket.onmessage?.({
                  data: JSON.stringify({ jsonrpc: "2.0", ...result }),
                }),
              );
            },
            close: () => {},
          };
          if (fakeNode.socketOpens) {
            queueMicrotask(() => socket.onopen?.());
          }
          fakeNode.lastSocket = socket;
          return socket;
        },
        network,
        options,
      );
    }
  }
  return { ...actual, WebSocketProvider: FakeSocketWebSocketProvider };
});

const targetChainName: ChainName = "matic";
const targetChain: Chain = TARGET_CHAINS.find(
  (chain: Chain) => chain.name === targetChainName,
)!;
const otherChainId: number = 1;
let spyUpdateDbItemChainStatus: MockInstance;

beforeAll(() => {
  spyUpdateDbItemChainStatus = vi
    .spyOn(dbChainStatusDataHandlers, "updateDbItemChainStatus")
    .mockResolvedValue();
  vi.spyOn(JsonRpcProvider.prototype, "_send").mockImplementation(
    async (payload) => {
      expect(Array.isArray(payload)).toBe(false);
      return [answer(payload as JsonRpcPayload)];
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  fakeNode.socketThrows = false;
  fakeNode.answers = true;
});
afterAll(() => {
  vi.restoreAllMocks();
});

function expectLastNodeStatus(nodeStatus: string): void {
  expect(spyUpdateDbItemChainStatus).toHaveBeenLastCalledWith(
    targetChainName,
    "nodeStatus",
    nodeStatus,
  );
}

describe("getNodeProvider checks the chain of the node", () => {
  test.each([
    { rpc: "http://127.0.0.1:9", providerClass: JsonRpcProvider },
    { rpc: "ws://127.0.0.1:9", providerClass: WebSocketProvider },
  ])(
    "should connect to the target chain: $rpc",
    async ({ rpc, providerClass }) => {
      fakeNode.chainId = targetChain.chainId;
      fakeNode.socketOpens = true;
      fakeNode.methods = [];
      const nodeProvider = await getNodeProvider(targetChain, rpc);
      expect(nodeProvider).toBeInstanceOf(providerClass);
      expect(fakeNode.methods).toContain("eth_chainId");
      expectLastNodeStatus("SUCCESS");
      await nodeProvider?.destroy();
    },
  );

  test.each([{ rpc: "http://127.0.0.1:9" }, { rpc: "ws://127.0.0.1:9" }])(
    "should be WRONG_CHAIN when the node is on another chain: $rpc",
    async ({ rpc }) => {
      fakeNode.chainId = otherChainId;
      fakeNode.socketOpens = true;
      fakeNode.methods = [];
      expect(await getNodeProvider(targetChain, rpc)).toBeUndefined();
      expectLastNodeStatus("WRONG_CHAIN");
    },
  );

  test("should be NETWORK_ERROR when the socket does not open in 10 seconds", async () => {
    vi.useFakeTimers();
    fakeNode.chainId = targetChain.chainId;
    fakeNode.socketOpens = false;
    fakeNode.methods = [];
    let settled: boolean = false;
    const call = getNodeProvider(targetChain, "ws://127.0.0.1:9").then(
      (nodeProvider) => {
        settled = true;
        return nodeProvider;
      },
    );
    await vi.advanceTimersByTimeAsync(9999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await call).toBeUndefined();
    expectLastNodeStatus("NETWORK_ERROR");
  });

  test("should be NETWORK_ERROR when the socket cannot be made", async () => {
    fakeNode.socketThrows = true;
    expect(
      await getNodeProvider(targetChain, "ws://127.0.0.1:9"),
    ).toBeUndefined();
    expectLastNodeStatus("NETWORK_ERROR");
  });
});

describe("getNodeProvider when the node status cannot be saved", () => {
  test.each([
    { rpc: "http://127.0.0.1:9", providerClass: JsonRpcProvider },
    { rpc: "ws://127.0.0.1:9", providerClass: WebSocketProvider },
  ])(
    "should destroy the provider and throw: $rpc",
    async ({ rpc, providerClass }) => {
      fakeNode.chainId = targetChain.chainId;
      fakeNode.socketOpens = true;
      const dbError: Error = new Error("DB closed");
      spyUpdateDbItemChainStatus.mockImplementation(
        async (_chainName: ChainName, _key: string, value: unknown) => {
          if (value === "SUCCESS") throw dbError;
        },
      );
      const spyDestroy: MockInstance = vi.spyOn(
        providerClass.prototype,
        "destroy",
      );
      try {
        await expect(getNodeProvider(targetChain, rpc)).rejects.toBe(dbError);
        expect(spyDestroy).toHaveBeenCalledOnce();
      } finally {
        spyDestroy.mockRestore();
        spyUpdateDbItemChainStatus.mockResolvedValue(undefined);
      }
    },
  );

  test("should throw the error of the write when destroying fails too", async () => {
    fakeNode.chainId = targetChain.chainId;
    fakeNode.socketOpens = true;
    const dbError: Error = new Error("DB closed");
    spyUpdateDbItemChainStatus.mockImplementation(
      async (_chainName: ChainName, _key: string, value: unknown) => {
        if (value === "SUCCESS") throw dbError;
      },
    );
    const spyDestroy: MockInstance = vi
      .spyOn(WebSocketProvider.prototype, "destroy")
      .mockRejectedValue(new Error("destroy failed"));
    try {
      await expect(
        getNodeProvider(targetChain, "ws://127.0.0.1:9"),
      ).rejects.toBe(dbError);
    } finally {
      spyDestroy.mockRestore();
      spyUpdateDbItemChainStatus.mockResolvedValue(undefined);
    }
  });
});

describe("getNodeProvider with an http RPC", () => {
  test("should not send eth_chainId for each getLogs", async () => {
    fakeNode.chainId = targetChain.chainId;
    fakeNode.methods = [];
    const nodeProvider = await getNodeProvider(
      targetChain,
      "http://127.0.0.1:9",
    );
    const countChainIdRequests = (): number =>
      fakeNode.methods.filter((method) => method === "eth_chainId").length;
    expect(countChainIdRequests()).toBe(1);

    await nodeProvider!.getLogs({ fromBlock: 0, toBlock: 1 });
    const countAfterFirstGetLogs: number = countChainIdRequests();
    await nodeProvider!.getLogs({ fromBlock: 2, toBlock: 3 });
    await nodeProvider!.getLogs({ fromBlock: 4, toBlock: 5 });
    expect(countChainIdRequests()).toBe(countAfterFirstGetLogs);
    expect(fakeNode.methods.filter((m) => m === "eth_getLogs")).toHaveLength(3);
    await nodeProvider?.destroy();
  });
});

describe("getNodeProvider with a WebSocket RPC", () => {
  // With fake timers from the start, because ethers starts the provider on
  // timers too.
  async function getWebSocketProvider(): Promise<NodeProvider> {
    vi.useFakeTimers();
    fakeNode.chainId = targetChain.chainId;
    fakeNode.socketOpens = true;
    fakeNode.methods = [];
    const call = getNodeProvider(targetChain, "ws://127.0.0.1:9");
    await vi.advanceTimersByTimeAsync(1000);
    const nodeProvider = await call;
    expect(nodeProvider).toBeInstanceOf(WebSocketProvider);
    expect(vi.getTimerCount()).toBe(0);
    return nodeProvider!;
  }
  // Keeps how a request ended, so that a test can check it without waiting.
  function watch(request: Promise<unknown>): {
    settled: boolean;
    error: unknown;
  } {
    const state = { settled: false, error: undefined as unknown };
    request.then(
      () => {
        state.settled = true;
      },
      (error: unknown) => {
        state.settled = true;
        state.error = error;
      },
    );
    return state;
  }

  test("should reject a request with TIMEOUT when the node does not answer in 60 seconds", async () => {
    const nodeProvider = await getWebSocketProvider();
    fakeNode.answers = false;
    const request = watch(nodeProvider.getBlockNumber());
    // ethers sends the request on a timer.
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(59999);
    expect(request.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(request.settled).toBe(true);
    expect(isError(request.error, "TIMEOUT")).toBe(true);
    await nodeProvider.destroy();
  });

  test("should leave no timer after a request answered in time", async () => {
    const nodeProvider = await getWebSocketProvider();
    const request = watch(nodeProvider.getBlockNumber());
    // Past the cache of ethers for a request (250 ms).
    await vi.advanceTimersByTimeAsync(1000);
    expect(request.settled).toBe(true);
    expect(request.error).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    await nodeProvider.destroy();
  });

  test("should reject a waiting request with NETWORK_ERROR when the socket closes", async () => {
    const nodeProvider = await getWebSocketProvider();
    fakeNode.answers = false;
    const request = watch(nodeProvider.getBlockNumber());
    await vi.advanceTimersByTimeAsync(0);
    expect(request.settled).toBe(false);
    fakeNode.lastSocket?.onclose?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(request.settled).toBe(true);
    expect(isError(request.error, "NETWORK_ERROR")).toBe(true);
    await nodeProvider.destroy();
  });

  test("should reject a request sent after the socket closes with NETWORK_ERROR", async () => {
    const nodeProvider = await getWebSocketProvider();
    fakeNode.answers = false;
    fakeNode.lastSocket?.onclose?.();
    const request = watch(nodeProvider.getBlockNumber());
    await vi.advanceTimersByTimeAsync(0);
    expect(request.settled).toBe(true);
    expect(isError(request.error, "NETWORK_ERROR")).toBe(true);
    await nodeProvider.destroy();
  });
});
