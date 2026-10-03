import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { get } from "svelte/store";
import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
import { storeSyncLockedByOtherTab } from "#eventLogs/syncLock.js";
import { storeChainStatus } from "#stores/storeChainStatus.js";
import { storeRpcSettings } from "#stores/storeRpcSettings.js";
import { storeSyncStatus } from "#stores/storeSyncStatus.js";
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
vi.mock("#eventLogs/syncLock.js", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncLockedByOtherTab: writable({ chain1: false }) };
});
vi.mock("#stores/storeSyncStatus.js", async () => {
  const { writable } = await import("svelte/store");
  return {
    storeSyncStatus: writable({ chain1: { syncStateText: "stopped" } }),
  };
});

describe("SyncListChainRpcInputHelperLabel.svelte", () => {
  afterEach(() => {
    storeRpcSettings.set({ chain1: { rpc: "" } } as never);
    storeChainStatus.set({ chain1: { nodeStatus: undefined } } as never);
    storeSyncStatus.set({ chain1: { syncStateText: "stopped" } } as never);
    storeSyncLockedByOtherTab.set({ chain1: false });
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
      // The darker color of the links, for the contrast on the nav (#639).
      expect(link.classList).toContain(colorClasses.interactive.textEmphasis);
      expect(link.classList).not.toContain(colorClasses.interactive.text);
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

  // "stopping": this tab is stopping the sync. Another tab that syncs the
  // chain holds its lock, and the sync state of this tab stays "stopped".
  test.each([
    ["stopping", false],
    ["stopped", true],
  ])(
    "shows Connected. instead of why the sync stopped while the sync state is %s and another tab holds the lock: %s, and keeps the reason",
    (syncStateText, isLockedByOtherTab) => {
      storeRpcSettings.set({ chain1: { rpc: "https://foo" } } as never);
      storeChainStatus.set({ chain1: { nodeStatus: "SUCCESS" } } as never);
      storeSyncStatus.set({ chain1: { syncStateText } } as never);
      storeSyncLockedByOtherTab.set({ chain1: isLockedByOtherTab });
      storeSyncStoppedReason.record("chain1", "RPC_ERRORS");
      render(SyncListChainRpcInputHelperLabel);
      expect(screen.getByText("Connected.")).toBeTruthy();
      expect(screen.queryByRole("link")).toBeNull();
      expect(get(storeSyncStoppedReason).chain1).toBe("RPC_ERRORS");
    },
  );
});
