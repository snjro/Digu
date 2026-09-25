import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseButtonIcon from "./BaseButtonIcon.svelte";

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

function icon(container: HTMLElement, name: string): SVGElement {
  const svg = container.querySelector<SVGElement>(`svg#${name}`);
  if (!svg) throw new Error(`No icon ${name}`);
  return svg;
}

describe("BaseButtonIcon.svelte", () => {
  test("shows the icon and calls onclick with the click event", async () => {
    const onclick = vi.fn();
    const { container } = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      onclick,
    });
    expect(icon(container, "close")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button"));
    expect(onclick).toHaveBeenCalledOnce();
    expect(onclick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  test("puts the icon before or after the label by isPrefixIcon", () => {
    const before = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      label: "Close",
    });
    const label = before.getByText("Close");
    expect(
      icon(before.container, "close").compareDocumentPosition(label) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    before.unmount();

    const after = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      label: "Close",
      isPrefixIcon: false,
    });
    expect(
      after
        .getByText("Close")
        .compareDocumentPosition(icon(after.container, "close")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("updates the icon and the label when the props change", async () => {
    const { container, rerender } = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      label: "Close",
    });
    await rerender({ iconName: "download", label: "Download" });
    expect(container.querySelector("svg#close")).toBeNull();
    expect(icon(container, "download")).toBeTruthy();
    expect(screen.getByText("Download")).toBeTruthy();
  });

  test("uses the emphasis fill on hover and calls the callbacks", async () => {
    const onmouseenter = vi.fn();
    const onmouseleave = vi.fn();
    const { container } = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      colorCategoryFront: "secondary",
      onmouseenter,
      onmouseleave,
    });
    const colors = colorDefinitions.light.secondary;
    const svg = icon(container, "close");
    expect(svg.classList.contains(colors.fill)).toBe(true);

    await fireEvent.mouseEnter(screen.getByRole("button"));
    expect(svg.classList.contains(colors.fillEmphasis)).toBe(true);
    expect(onmouseenter).toHaveBeenCalledOnce();
    expect(onmouseenter.mock.calls[0][0]).toBeInstanceOf(MouseEvent);

    await fireEvent.mouseLeave(screen.getByRole("button"));
    expect(svg.classList.contains(colors.fill)).toBe(true);
    expect(onmouseleave).toHaveBeenCalledOnce();
  });

  test("follows the theme in storeUserSettings", async () => {
    const { container } = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      colorCategoryFront: "secondary",
    });
    expect(colorDefinitions.dark.secondary.fill).not.toBe(
      colorDefinitions.light.secondary.fill,
    );
    storeUserSettings.updateState({ themeColor: "dark" });
    await Promise.resolve();
    expect(
      icon(container, "close").classList.contains(
        colorDefinitions.dark.secondary.fill,
      ),
    ).toBe(true);
  });

  test("disables the button", async () => {
    const { rerender } = render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      disabled: true,
    });
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
    await rerender({ disabled: false });
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
  });

  test("passes ariaLabel to the button", () => {
    render(BaseButtonIcon, {
      iconName: "close",
      size: "md",
      ariaLabel: "Close",
    });
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});
