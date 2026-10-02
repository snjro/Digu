import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
import SyncListChainRpcInputHelperLabel from "./SyncListChainRpcInputHelperLabel.svelte";
import { RPC_GUIDE_URL } from "./rpcInputHelperLabel";

// The real stores build their state from the chain data, which loads ethers.
vi.mock("#stores/storeUserSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeUserSettings: writable({ selectedChainName: "chain1" }) };
});
vi.mock("#stores/storeRpcSettings.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({ chain1: { rpc: "" } }) };
});
vi.mock("#stores/storeChainStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeChainStatus: writable({ chain1: { nodeStatus: undefined } }) };
});

describe("SyncListChainRpcInputHelperLabel.svelte", () => {
  afterEach(() => {
    storeRpcSettings.set({ chain1: { rpc: "" } } as never);
    storeChainStatus.set({ chain1: { nodeStatus: undefined } } as never);
    storeSyncStoppedReason.clear("chain1");
  });

  test.each([
    ["INVALID_URL", "", "Enter URL of RPC."],
    [
      "NETWORK_ERROR",
      "https://foo",
      "Error. Cannot reach this RPC. Check the URL.",
    ],
  ])(
    "shows the link to the guide in a new tab after the text when the node status is %s",
    (nodeStatus, rpc, text) => {
      storeRpcSettings.set({ chain1: { rpc } } as never);
      storeChainStatus.set({ chain1: { nodeStatus } } as never);
      render(SyncListChainRpcInputHelperLabel);
      const link = screen.getByRole("link", { name: "How to get one" });
      expect(link.getAttribute("href")).toBe(RPC_GUIDE_URL);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noreferrer noopener");
      const label = link.closest("label");
      expect(label?.firstChild?.textContent).toBe(text);
      expect(label?.lastElementChild).toBe(link);
    },
  );

  test("shows no link when the node status is SUCCESS", () => {
    storeRpcSettings.set({ chain1: { rpc: "https://foo" } } as never);
    storeChainStatus.set({ chain1: { nodeStatus: "SUCCESS" } } as never);
    render(SyncListChainRpcInputHelperLabel);
    expect(screen.getByText("Connected.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  test("shows why the sync stopped, with the link to the guide after RPC errors", () => {
    storeRpcSettings.set({ chain1: { rpc: "https://foo" } } as never);
    storeChainStatus.set({ chain1: { nodeStatus: "SUCCESS" } } as never);
    storeSyncStoppedReason.record("chain1", "RPC_ERRORS");
    render(SyncListChainRpcInputHelperLabel);
    const link = screen.getByRole("link", { name: "How to get one" });
    expect(link.getAttribute("href")).toBe(RPC_GUIDE_URL);
    expect(link.closest("label")?.firstChild?.textContent).toBe(
      "Sync stopped: RPC errors. Try another RPC.",
    );
  });

  test("shows why the sync stopped, without a link, after an unexpected error", () => {
    storeRpcSettings.set({ chain1: { rpc: "https://foo" } } as never);
    storeChainStatus.set({ chain1: { nodeStatus: "SUCCESS" } } as never);
    storeSyncStoppedReason.record("chain1", "UNEXPECTED_ERROR");
    render(SyncListChainRpcInputHelperLabel);
    expect(screen.getByText("Sync stopped: unexpected error.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
