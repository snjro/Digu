import { describe, expect, test, vi } from "vitest";
import { tick } from "svelte";
import { fireEvent, render, screen } from "@testing-library/svelte";
import type {
  Chain,
  Contract,
  FunctionAbiFragment,
  Project,
  Version,
} from "@constants/chains/types";
import Page from "./+page.svelte";
import type { LoadFunction } from "./+page";

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/") },
  navigating: { type: null },
}));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

// The real children need the chain data, which loads ethers. ethers does not
// load in the client project, so each child is a stub that shows its name.
vi.mock("./FunctionOverview.svelte", async () => {
  const { default: Stub } = await import("./pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, { ...props, stubName: "FunctionOverview" }),
  };
});
vi.mock("$lib/contracts/abiJson/AbiJsonViewer.svelte", async () => {
  const { default: Stub } = await import("./pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, { ...props, stubName: "AbiJsonViewer" }),
  };
});

const data: LoadFunction = {
  targetChain: { name: "chain1" } as Chain,
  targetProject: { name: "project1" } as Project,
  targetVersion: { name: "version1" } as Version,
  targetContract: { name: "contract1" } as Contract,
  targetFunctionAbiFragment: { name: "function1" } as FunctionAbiFragment,
};

function tab(value: string): HTMLInputElement {
  const input = document.getElementById(`tabGroupFunction_${value}`);
  if (!input) throw new Error(`no tab ${value}`);
  return input as HTMLInputElement;
}

// PageWrapper changes tabsDefinition.selected inside the object it is bound
// to, so the page must see a change made inside the object.
describe("functions/[functionName]/+page.svelte", () => {
  test("shows the content of the selected tab", async () => {
    render(Page, { data });
    expect(screen.getByTestId("stub").textContent).toBe("FunctionOverview");

    await fireEvent.click(tab("ABI"));
    await tick();
    expect(tab("ABI").checked).toBe(true);
    expect(screen.getByTestId("stub").textContent).toBe("AbiJsonViewer");

    await fireEvent.click(tab("Overview"));
    await tick();
    expect(screen.getByTestId("stub").textContent).toBe("FunctionOverview");
  });
});
