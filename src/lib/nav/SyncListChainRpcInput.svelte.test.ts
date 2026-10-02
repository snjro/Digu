import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { get } from "svelte/store";
import { showSnackBarAsSaveFailed } from "#lib/common/saveFailed.js";
import {
  storeNoDbSnackBar,
  storeNoDbSnackBarInitialValue,
} from "#stores/storeNoDb.js";
import SyncListChainRpcInput from "./SyncListChainRpcInput.svelte";
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
  return { storeSyncStatus: writable({ chain1: { isSyncing: false } }) };
});
// The real module loads the chain data, which loads ethers.
vi.mock("#eventLogs/syncLock.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncLockedByOtherTab: writable({}) };
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

describe("SyncListChainRpcInput.svelte", () => {
  beforeEach(() => {
    vi.mocked(updateRpc).mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
    storeNoDbSnackBar.set({ ...storeNoDbSnackBarInitialValue });
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
