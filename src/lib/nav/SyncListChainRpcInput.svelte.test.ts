import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { get, type Writable } from "svelte/store";
import {
  storeChainActivity,
  type ChainActivity,
} from "#eventLogs/chainActivity.js";
import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "#stores/storeNoDb.js";
import SyncListChainRpcInput from "./SyncListChainRpcInput.svelte";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import type { RpcInputType } from "#db/dbTypes.js";
import { updateRpc } from "./rpcInput";
import { customLogger } from "#utils/logger.js";

// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("#stores/storeUserSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "chain1" }) };
});
vi.mock("#stores/storeRpcSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeRpcSettings: writable({
      chain1: { rpc: "https://foo", inputType: "password" },
    }),
  };
});
vi.mock("#stores/storeChainStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainStatus: writable({ chain1: { nodeStatus: undefined } }) };
});
vi.mock("#stores/storeSyncStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeSyncStatus: writable({ chain1: { syncStateText: "stopped" } }),
  };
});
// The real module loads the chain data, which loads ethers.
vi.mock("#eventLogs/chainActivity.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainActivity: writable({ chain1: "free" }) };
});
vi.mock("#utils/utilsDb.js", () => ({
  getTargetChain: () => ({ name: "chain1" }),
}));
// The real module loads ethers through getNodeProvider.
vi.mock("./rpcInput", () => ({
  blurOnEnter: vi.fn(),
  clearSucceededNodeStatus: vi.fn(),
  toggleRpcInputType: vi.fn(),
  updateRpc: vi.fn(),
}));
vi.mock("#utils/logger.js", () => ({ customLogger: { error: vi.fn() } }));

const activity = storeChainActivity as unknown as Writable<
  Record<string, ChainActivity>
>;
const rpcSettings = storeRpcSettings as unknown as Writable<
  Record<string, { rpc: string; inputType: RpcInputType }>
>;

describe("SyncListChainRpcInput.svelte", () => {
  beforeEach(() => {
    activity.set({ chain1: "free" });
    vi.mocked(updateRpc).mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
    rpcSettings.set({ chain1: { rpc: "https://foo", inputType: "password" } });
  });

  test("hides the RPC with CSS and keeps type text, so Chrome does not offer to save it", async () => {
    render(SyncListChainRpcInput);
    const input = screen.getByLabelText("RPC URL") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.classList.contains("hidetext")).toBe(true);

    rpcSettings.set({ chain1: { rpc: "https://foo", inputType: "text" } });
    await tick();
    expect(input.type).toBe("text");
    expect(input.classList.contains("hidetext")).toBe(false);
  });

  test.each<ChainActivity>([
    "syncing",
    "stopping",
    "otherTab",
    "smallImport",
    "largeImport",
    "resetting",
  ])("disables the input while the chain is busy: %s", async (busy) => {
    render(SyncListChainRpcInput);
    const input = screen.getByLabelText("RPC URL") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    activity.set({ chain1: busy });
    await tick();
    expect(input.disabled).toBe(true);
    activity.set({ chain1: "free" });
    await tick();
    expect(input.disabled).toBe(false);
  });

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
    expect(get(storeNoDbSnackBar).visible).toBe(false);
  });

  test("shows the save failed snackbar when saving the RPC fails", async () => {
    render(SyncListChainRpcInput);
    const error = new Error("DB error");
    vi.mocked(updateRpc).mockRejectedValueOnce(error);
    await fireEvent.blur(screen.getByLabelText("RPC URL"));
    await vi.waitFor(() =>
      expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed),
    );
    expect(customLogger.error).toHaveBeenCalledWith("Update the RPC.", {
      chainName: "chain1",
      errorObject: error,
    });
  });

  test.each([
    ["rejects", () => Promise.reject(new Error("DB error"))],
    [
      "throws",
      () => {
        throw new Error("DB error");
      },
    ],
  ])("shows the saved RPC again when saving the RPC %s", async (_, fail) => {
    render(SyncListChainRpcInput);
    const input = screen.getByLabelText("RPC URL") as HTMLInputElement;
    vi.mocked(updateRpc).mockImplementationOnce(fail);

    await fireEvent.input(input, { target: { value: "https://bar" } });
    expect(input.value).toBe("https://bar");
    await fireEvent.blur(input);
    await vi.waitFor(() =>
      expect(get(storeNoDbSnackBar)).toEqual(showSnackBarAsSaveFailed),
    );
    expect(updateRpc).toHaveBeenLastCalledWith(
      { name: "chain1" },
      "https://bar",
    );
    expect(input.value).toBe("https://foo");
  });
});
