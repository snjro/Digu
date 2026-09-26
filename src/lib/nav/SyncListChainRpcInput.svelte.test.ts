import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import SyncListChainRpcInput from "./SyncListChainRpcInput.svelte";
import { updateRpc } from "./rpcInput";
import { customLogger } from "@utils/logger";

// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("@stores/storeUserSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "chain1" }) };
});
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeRpcSettings: writable({
      chain1: { rpc: "https://foo", inputType: "password" },
    }),
  };
});
vi.mock("@stores/storeChainStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainStatus: writable({ chain1: { nodeStatus: undefined } }) };
});
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({ chain1: { isSyncing: false } }) };
});
vi.mock("@utils/utilsDb", () => ({
  getTargetChain: () => ({ name: "chain1" }),
}));
// The real module loads ethers through getNodeProvider.
vi.mock("./rpcInput", () => ({
  blurOnEnter: vi.fn(),
  clearSucceededNodeStatus: vi.fn(),
  toggleRpcInputType: vi.fn(),
  updateRpc: vi.fn(),
}));
vi.mock("@utils/logger", () => ({ customLogger: { error: vi.fn() } }));

describe("SyncListChainRpcInput.svelte", () => {
  test("logs a failed update of the RPC when the chain is shown", async () => {
    const error = new Error("DB error");
    vi.mocked(updateRpc).mockRejectedValueOnce(error);
    render(SyncListChainRpcInput);
    await vi.waitFor(() =>
      expect(customLogger.error).toHaveBeenCalledWith("Update the RPC.", {
        chainName: "chain1",
        errorObject: error,
      }),
    );
  });
});
