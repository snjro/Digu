import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import PageWrapperContentFunctionBarButtonsThreeDots from "./PageWrapperContentFunctionBarButtonsThreeDots.svelte";

function renderThreeDots() {
  return render(PageWrapperContentFunctionBarButtonsThreeDots, {
    buttonsDefinition: [
      [
        {
          iconName: "download",
          tooltipText: "Export",
          onClickEventFunction: () => {},
          tooltipXPosition: "left",
          tooltipYPosition: "bottom",
        },
      ],
    ],
    buttonSize: "md",
    colorCategory: colorSettings.gridFunctionButton,
  });
}
function getMenu(container: HTMLElement): HTMLElement {
  return container.querySelector(".absolute") as HTMLElement;
}
async function openMenu(container: HTMLElement): Promise<void> {
  await fireEvent.click(screen.getAllByRole("button")[0]);
  expect(getMenu(container).classList).not.toContain("hidden");
}

describe("PageWrapperContentFunctionBarButtonsThreeDots.svelte", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("hides the menu when Escape is pressed", async () => {
    const { container } = renderThreeDots();
    await openMenu(container);
    await fireEvent.keyDown(document, { key: "Escape" });
    expect(getMenu(container).classList).toContain("hidden");
  });

  test("hides the menu when clicked outside", async () => {
    const { container } = renderThreeDots();
    await openMenu(container);
    await fireEvent.click(document.body);
    expect(getMenu(container).classList).toContain("hidden");
  });

  test("removes the document listeners when destroyed", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderThreeDots();
    const added = add.mock.calls.map(([type, listener]) => [type, listener]);
    expect(added.map(([type]) => type)).toEqual(
      expect.arrayContaining(["keydown", "click"]),
    );
    unmount();
    const removed = remove.mock.calls.map(([type, listener]) => [
      type,
      listener,
    ]);
    expect(removed).toEqual(expect.arrayContaining(added));
  });
});
