import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { get } from "svelte/store";
import { goto } from "$app/navigation";
import { storeNodbShowLoader } from "@stores/storeNoDb";
import SelectChain from "./SelectChain.svelte";
import { saveSelectedChainName } from "./selectChain";

const { selectProps } = vi.hoisted(() => ({
  selectProps: {} as { onchange?: (event: Event) => Promise<void> },
}));

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("./selectChain", () => ({ saveSelectedChainName: vi.fn() }));
// The real chain data loads ethers, which does not load in the client project.
vi.mock("@constants/chains/_index", () => ({
  TARGET_CHAINS: [
    { name: "eth", fullName: "Ethereum" },
    { name: "matic", fullName: "Polygon" },
  ],
}));
// Keeps the change handler, so that a test can wait for its promise.
vi.mock("$lib/base/BaseSelect.svelte", () => ({
  default: (_anchor: unknown, props: typeof selectProps) => {
    selectProps.onchange = props.onchange;
  },
}));

function selectChain(chainName: string): Promise<void> {
  render(SelectChain);
  return selectProps.onchange!({
    target: { value: chainName },
  } as unknown as Event);
}

describe("SelectChain.svelte", () => {
  afterEach(() => {
    vi.mocked(saveSelectedChainName).mockReset();
    vi.mocked(goto).mockReset();
    storeNodbShowLoader.set(false);
    selectProps.onchange = undefined;
  });

  test("shows the loader while it saves the chain and moves to its root", async () => {
    const loaderValues: boolean[] = [];
    vi.mocked(saveSelectedChainName).mockImplementation(async () => {
      loaderValues.push(get(storeNodbShowLoader));
    });
    await selectChain("matic");
    expect(saveSelectedChainName).toHaveBeenCalledExactlyOnceWith("matic");
    expect(goto).toHaveBeenCalledExactlyOnceWith("/matic");
    expect(loaderValues).toEqual([true]);
    expect(get(storeNodbShowLoader)).toBe(false);
  });

  test("hides the loader when saving the chain fails", async () => {
    vi.mocked(saveSelectedChainName).mockRejectedValue(new Error("DB error"));
    await expect(selectChain("matic")).rejects.toThrow("DB error");
    expect(goto).not.toHaveBeenCalled();
    expect(get(storeNodbShowLoader)).toBe(false);
  });
});
