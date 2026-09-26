import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { goto } from "$app/navigation";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import PageWrapper from "./PageWrapper.svelte";
import PageWrapperContentFunctionBarButtonsThreeDots from "./PageWrapperContentFunctionBarButtonsThreeDots.svelte";
import PageWrapperTestHost from "./PageWrapper.testHost.svelte";

const CONTRACT_URL = "http://localhost/eth/v1/contracts/c/";

const { navigating, page } = vi.hoisted(() => ({
  navigating: { type: null as string | null },
  page: { url: new URL("http://localhost/eth/v1/contracts/c/") },
}));
vi.mock("$app/state", () => ({ page, navigating }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

function renderWithTabs(): void {
  render(PageWrapperTestHost);
}

describe("PageWrapper.svelte", () => {
  afterEach(() => {
    navigating.type = null;
    page.url = new URL(CONTRACT_URL);
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

  test("selects the tab of the URL hash", () => {
    page.url = new URL(`${CONTRACT_URL}#abi`);
    renderWithTabs();
    expect(screen.getByTestId("selected").textContent).toBe("ABI");
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

  test("stays in the full screen while Escape is held down", async () => {
    // The first keydown may have closed a dialog; the repeats must not go further.
    const wrapper: HTMLElement = renderFullScreen();
    await fireEvent.keyDown(document.body, { key: "Escape", repeat: true });
    expect(wrapper.classList).toContain("w-screen");
  });

  test("stays in the full screen when Escape cancels an IME composition", async () => {
    const wrapper: HTMLElement = renderFullScreen();
    await fireEvent.keyDown(document.body, {
      key: "Escape",
      isComposing: true,
    });
    expect(wrapper.classList).toContain("w-screen");
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
