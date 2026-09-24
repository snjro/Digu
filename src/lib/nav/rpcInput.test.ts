import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Chain } from "@constants/chains/types";
import { updateDbItemChainStatus } from "@db/dbChainStatusDataHandlers";
import { updateDbItemRpcSettings } from "@db/dbSettings";
import type { NodeStatus } from "@db/dbTypes";
import { getNodeProvider, type NodeProvider } from "@utils/utilsEthers";
import {
  clearSucceededNodeStatus,
  getToggledRpcInputType,
  toggleRpcInputType,
  updateRpc,
} from "./rpcInput";

vi.mock("@db/dbSettings", () => ({ updateDbItemRpcSettings: vi.fn() }));
vi.mock("@db/dbChainStatusDataHandlers", () => ({
  updateDbItemChainStatus: vi.fn(),
}));
vi.mock("@utils/utilsEthers", () => ({ getNodeProvider: vi.fn() }));

const targetChain = { name: "eth" } as unknown as Chain;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateRpc", () => {
  test("should save the rpc and then connect to it", async () => {
    await updateRpc(targetChain, "https://localhost:8545");
    expect(updateDbItemRpcSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith(
      "eth",
      "rpc",
      "https://localhost:8545",
    );
    expect(getNodeProvider).toHaveBeenCalledTimes(1);
    expect(getNodeProvider).toHaveBeenCalledWith(
      targetChain,
      "https://localhost:8545",
    );
    expect(
      vi.mocked(updateDbItemRpcSettings).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(getNodeProvider).mock.invocationCallOrder[0]);
  });

  test("should destroy the provider after connecting", async () => {
    const destroy = vi.fn();
    vi.mocked(getNodeProvider).mockResolvedValueOnce({
      destroy,
    } as unknown as NodeProvider);
    await updateRpc(targetChain, "https://localhost:8545");
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test("should do nothing more when there is no provider", async () => {
    vi.mocked(getNodeProvider).mockResolvedValueOnce(undefined);
    await expect(
      updateRpc(targetChain, "https://localhost:8545"),
    ).resolves.toBeUndefined();
  });

  test("should save an empty rpc as it is", async () => {
    await updateRpc(targetChain, "");
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith("eth", "rpc", "");
    expect(getNodeProvider).toHaveBeenCalledWith(targetChain, "");
  });
});

describe("clearSucceededNodeStatus", () => {
  test("should clear the node status when it is SUCCESS", async () => {
    await clearSucceededNodeStatus("eth", "SUCCESS");
    expect(updateDbItemChainStatus).toHaveBeenCalledTimes(1);
    expect(updateDbItemChainStatus).toHaveBeenCalledWith(
      "eth",
      "nodeStatus",
      undefined,
    );
  });

  test.each<NodeStatus>([
    "CONNECTING",
    "INVALID_URL",
    "INVALID_PROTOCOL",
    "NETWORK_ERROR",
    "WRONG_CHAIN",
    undefined,
  ])("should not write when the node status is %j", async (nodeStatus) => {
    await clearSucceededNodeStatus("eth", nodeStatus);
    expect(updateDbItemChainStatus).not.toHaveBeenCalled();
  });
});

describe("getToggledRpcInputType", () => {
  test.each([
    ["text", "password"],
    ["password", "text"],
  ] as const)("should turn %j into %j", (current, toggled) => {
    expect(getToggledRpcInputType(current)).toBe(toggled);
  });
});

describe("toggleRpcInputType", () => {
  test.each([
    ["text", "password"],
    ["password", "text"],
  ] as const)("should save %j as %j", async (current, toggled) => {
    await toggleRpcInputType("eth", current);
    expect(updateDbItemRpcSettings).toHaveBeenCalledTimes(1);
    expect(updateDbItemRpcSettings).toHaveBeenCalledWith(
      "eth",
      "inputType",
      toggled,
    );
  });
});
