import type { Chain, ChainName } from "@constants/chains/types";
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
import { getNodeProvider } from "./utilsEthers";
import { TARGET_CHAINS } from "@constants/chains/_index";
import * as dbChainStatusDataHandlers from "@db/dbChainStatusDataHandlers";
import {
  JsonRpcProvider,
  WebSocketProvider,
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
  methods: [] as string[],
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
          const socket: WebSocketLike = {
            onopen: null,
            onmessage: null,
            onerror: null,
            readyState: 0,
            send: (message: string) => {
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
