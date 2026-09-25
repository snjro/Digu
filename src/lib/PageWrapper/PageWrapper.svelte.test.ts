import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { goto } from "$app/navigation";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import PageWrapper from "./PageWrapper.svelte";
import PageWrapperContentFunctionBarButtonsThreeDots from "./PageWrapperContentFunctionBarButtonsThreeDots.svelte";
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

describe("PageWrapper.svelte full screen", () => {
  function renderFullScreen(): HTMLElement {
    const { container } = render(PageWrapper, { isFullScreen: true });
    return container.firstElementChild as HTMLElement;
  }

  afterEach(() => {
    document.querySelectorAll("dialog").forEach((dialog) => dialog.remove());
  });

  test("leaves the full screen on Escape", async () => {
    const wrapper: HTMLElement = renderFullScreen();
    expect(wrapper.classList).toContain("w-screen");
    await fireEvent.keyDown(document.body, { key: "Escape" });
    expect(wrapper.classList).not.toContain("w-screen");
  });

  test("stays in the full screen when Escape closes an open dialog", async () => {
    const wrapper: HTMLElement = renderFullScreen();
    const dialog: HTMLDialogElement = document.createElement("dialog");
    document.body.append(dialog);
    dialog.showModal();
    await fireEvent.keyDown(dialog, { key: "Escape" });
    expect(wrapper.classList).toContain("w-screen");
  });

  test("stays in the full screen when Escape closes the menu", async () => {
    // The menu listens first, so the full screen cannot rely on the order.
    const { container: menu } = render(
      PageWrapperContentFunctionBarButtonsThreeDots,
      {
        buttonsDefinition: [[]],
        buttonSize: "md",
        colorCategory: colorSettings.gridFunctionButton,
      },
    );
    const wrapper: HTMLElement = renderFullScreen();
    await fireEvent.click(within(menu).getByRole("button", { name: "More" }));
    await fireEvent.keyDown(document.body, { key: "Escape" });
    expect(menu.querySelector(".absolute")?.classList).toContain("hidden");
    expect(wrapper.classList).toContain("w-screen");
  });
});
