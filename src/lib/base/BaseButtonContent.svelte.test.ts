import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import BaseButtonContent from "./BaseButtonContent.svelte";
import { baseTextSizes } from "./baseSizes";
import { htmlSnippet, slotProps } from "../../testUtils/snippets";

const props = {
  label: "Save",
  size: "md" as const,
  underlineLabel: false,
  designatedFontWeight: undefined,
};

describe("BaseButtonContent.svelte", () => {
  test("shows the label with its size and weight", () => {
    render(BaseButtonContent, { ...props, designatedFontWeight: "font-bold" });
    const label = screen.getByText("Save");
    expect(label.classList.contains(baseTextSizes.md)).toBe(true);
    expect(label.classList.contains("font-bold")).toBe(true);
  });

  test("shows no label when the label is empty", () => {
    const { container } = render(BaseButtonContent, {
      ...props,
      label: undefined,
    });
    expect(container.querySelector("span")).toBeNull();
  });

  test("underlines the label only when underlineLabel", async () => {
    const { rerender } = render(BaseButtonContent, props);
    const underline = () => screen.getByText("Save").parentElement!;
    expect(underline().classList.contains("border-transparent")).toBe(true);
    await rerender({ underlineLabel: true });
    expect(
      underline().classList.contains(colorClasses.interactive.border),
    ).toBe(true);
    expect(underline().classList.contains("border-transparent")).toBe(false);
  });

  test("updates the label when the prop changes", async () => {
    const { rerender } = render(BaseButtonContent, props);
    await rerender({ label: "Load", size: "xl" });
    const label = screen.getByText("Load");
    expect(label.classList.contains(baseTextSizes.xl)).toBe(true);
  });

  test("renders the named slots around the label", () => {
    render(BaseButtonContent, {
      ...props,
      ...slotProps({
        prefixIcon: htmlSnippet("<i data-testid='prefix'></i>"),
        suffixIcon: htmlSnippet("<i data-testid='suffix'></i>"),
      }),
    });
    const label = screen.getByText("Save");
    expect(
      screen.getByTestId("prefix").compareDocumentPosition(label) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      label.compareDocumentPosition(screen.getByTestId("suffix")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
