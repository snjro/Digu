import { describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import type { Writable } from "svelte/store";
import { fireEvent, render, screen } from "@testing-library/svelte";
import RpcConfigChanger from "./RpcConfigChanger.svelte";
import type { RpcConfigParam } from "./rpcConfigParams";
import { saveRpcConfigValue } from "./rpcConfigSave";
import { storeSyncStatus } from "@stores/storeSyncStatus";

// The real stores build their state from the chain data, which loads ethers.
// ethers does not load in the client project, so the stores are plain ones.
vi.mock("@stores/storeSyncStatus", async () => {
  const { writable } = await import("svelte/store");
  return { storeSyncStatus: writable({ chain1: { isSyncing: false } }) };
});
vi.mock("@stores/storeRpcSettings", async () => {
  const { writable } = await import("svelte/store");
  return { storeRpcSettings: writable({ chain1: { bulkUnit: 100 } }) };
});
vi.mock("./rpcConfigSave", () => ({ saveRpcConfigValue: vi.fn() }));

const rpcConfigParam: RpcConfigParam = {
  name: "bulkUnit",
  label: "Bulk Unit",
  minValue: 1,
  maxValue: 10000,
  step: 1,
};

function setIsSyncing(isSyncing: boolean): void {
  (storeSyncStatus as unknown as Writable<object>).set({
    chain1: { isSyncing },
  });
}

describe("RpcConfigChanger.svelte", () => {
  test("shows the saved value again when sync starts after an invalid value", async () => {
    render(RpcConfigChanger, {
      targetChainName: "chain1",
      rpcConfigParam,
      initializeValue: true,
    });
    const input = screen.getByRole("spinbutton", {
      name: "Bulk Unit",
    }) as HTMLInputElement;
    expect(input.value).toBe("100");

    await fireEvent.input(input, { target: { value: "0" } });
    await fireEvent.change(input);
    await tick();
    expect(input.value).toBe("0");
    expect(screen.getByText(/Error/)).toBeTruthy();
    expect(saveRpcConfigValue).not.toHaveBeenCalled();

    setIsSyncing(true);
    await tick();
    expect(input.value).toBe("100");
    expect(screen.queryByText(/Error/)).toBeNull();

    setIsSyncing(false);
    await tick();
    expect(input.value).toBe("100");
    expect(screen.queryByText(/Error/)).toBeNull();
  });
});
