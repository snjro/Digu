import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/svelte";
import BaseAccordionChildren from "./BaseAccordionChildren.svelte";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

function getRoot(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}
// The box that holds the slot is the last child of the root.
function getChildrenBox(container: HTMLElement): HTMLElement {
  return getRoot(container).lastElementChild as HTMLElement;
}

describe("BaseAccordionChildren.svelte", () => {
  test("renders the baseAccordionChildren slot", () => {
    const { container } = render(BaseAccordionChildren, {
      isOpenAccordion: true,
      showVerticalLine: true,
      ...slotProps({
        baseAccordionChildren: htmlSnippet("<p>child item</p>"),
      }),
    });
    expect(
      getChildrenBox(container).contains(screen.getByText("child item")),
    ).toBe(true);
  });

  test("hides the children while the accordion is closed", async () => {
    const { container, rerender } = render(BaseAccordionChildren, {
      isOpenAccordion: true,
      showVerticalLine: true,
    });
    expect(getRoot(container).classList).not.toContain("hidden");

    await rerender({ isOpenAccordion: false });
    expect(getRoot(container).classList).toContain("hidden");

    await rerender({ isOpenAccordion: true });
    expect(getRoot(container).classList).not.toContain("hidden");
  });

  test("shows the vertical line without extra padding", () => {
    const { container } = render(BaseAccordionChildren, {
      isOpenAccordion: true,
      showVerticalLine: true,
    });
    expect(getRoot(container).children).toHaveLength(2);
    expect(getChildrenBox(container).classList).toContain("pl-0");
  });

  test("pads the children instead of the vertical line", () => {
    const { container } = render(BaseAccordionChildren, {
      isOpenAccordion: true,
      showVerticalLine: false,
    });
    expect(getRoot(container).children).toHaveLength(1);
    expect(getChildrenBox(container).classList).toContain("pl-3");
  });
});
