import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { goto } from "$app/navigation";
import PageWrapper from "./PageWrapper.svelte";
import { TAB_VALUES_CONTRACT, type TabsDefinitionContract } from "./tabs";

const { navigating } = vi.hoisted(() => ({
  navigating: { type: null as string | null },
}));
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/eth/v1/contracts/c/") },
  navigating,
}));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

function renderWithTabs(): void {
  const tabsDefinition: TabsDefinitionContract = {
    selected: "Overview",
    values: TAB_VALUES_CONTRACT,
    groupName: "tabGroupContract",
  };
  render(PageWrapper, { tabsDefinition });
}

describe("PageWrapper.svelte", () => {
  afterEach(() => {
    navigating.type = null;
    vi.mocked(goto).mockClear();
  });

  test("adds the tab hash to a URL without one, replacing the history entry", () => {
    renderWithTabs();
    expect(goto).toHaveBeenCalledExactlyOnceWith(
      "/eth/v1/contracts/c/#overview",
      { replaceState: true },
    );
  });

  test("does not add the tab hash while a navigation is in progress", () => {
    navigating.type = "link";
    renderWithTabs();
    expect(goto).not.toHaveBeenCalled();
  });
});
