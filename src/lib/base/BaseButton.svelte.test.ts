import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseButton from "./BaseButton.svelte";
import { htmlSnippet, slotProps } from "../../testUtils/snippets";

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseButton.svelte", () => {
  test("shows the label and calls onclick with the click event", async () => {
    const onclick = vi.fn();
    render(BaseButton, { label: "Save", onclick });
    await fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Save")).toBeTruthy();
    expect(onclick).toHaveBeenCalledOnce();
    expect(onclick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  test("updates the label and disabled when the props change", async () => {
    const { rerender } = render(BaseButton, { label: "Save", disabled: true });
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
    await rerender({ label: "Load", disabled: false });
    expect(screen.getByText("Load")).toBeTruthy();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
  });

  test("uses the emphasis background on hover and calls the callbacks", async () => {
    const onmouseenter = vi.fn();
    const onmouseleave = vi.fn();
    render(BaseButton, {
      label: "Save",
      colorCategoryBg: "primary",
      onmouseenter,
      onmouseleave,
    });
    const button = screen.getByRole("button");
    const colors = colorClasses.primary;
    expect(button.classList.contains(colors.bg)).toBe(true);

    await fireEvent.mouseEnter(button);
    expect(button.classList.contains(colors.bgEmphasis)).toBe(true);
    expect(onmouseenter).toHaveBeenCalledOnce();
    expect(onmouseenter.mock.calls[0][0]).toBeInstanceOf(MouseEvent);

    await fireEvent.mouseLeave(button);
    expect(button.classList.contains(colors.bg)).toBe(true);
    expect(onmouseleave).toHaveBeenCalledOnce();
  });

  test("keeps the hover state of the parent when isHoverControledByParent", async () => {
    const onmouseenter = vi.fn();
    render(BaseButton, {
      label: "Save",
      colorCategoryBg: "primary",
      isHoverControledByParent: true,
      onmouseenter,
    });
    const button = screen.getByRole("button");
    await fireEvent.mouseEnter(button);
    expect(button.classList.contains(colorClasses.primary.bg)).toBe(true);
    expect(onmouseenter).toHaveBeenCalledOnce();
  });

  test("keeps the same color classes in both themes", async () => {
    render(BaseButton, { label: "Save", colorCategoryBg: "primary" });
    const button = screen.getByRole("button");
    storeUserSettings.updateState({ themeColor: "dark" });
    await Promise.resolve();
    expect(button.classList.contains(colorClasses.primary.bg)).toBe(true);
  });

  test("renders the named slots prefixIcon and suffixIcon", () => {
    render(BaseButton, {
      label: "Save",
      ...slotProps({
        prefixIcon: htmlSnippet("<i data-testid='prefix'></i>"),
        suffixIcon: htmlSnippet("<i data-testid='suffix'></i>"),
      }),
    });
    const prefix = screen.getByTestId("prefix");
    const suffix = screen.getByTestId("suffix");
    const label = screen.getByText("Save");
    expect(
      prefix.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      label.compareDocumentPosition(suffix) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("renders a link with the slots when href is set", () => {
    render(BaseButton, {
      label: "Docs",
      href: "https://example.com/",
      openNewTab: true,
      ...slotProps({
        prefixIcon: htmlSnippet("<i data-testid='prefix'></i>"),
      }),
    });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.com/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.textContent).toContain("Docs");
    expect(link.contains(screen.getByTestId("prefix"))).toBe(true);
  });

  test("shows the tooltip text", async () => {
    const { rerender } = render(BaseButton, {
      label: "Save",
      tooltipText: "Save the file",
    });
    expect(screen.getByText("Save the file")).toBeTruthy();
    await rerender({ tooltipText: "Other" });
    expect(screen.getByText("Other")).toBeTruthy();
  });

  test("names an icon button by ariaLabel, then by tooltipText", async () => {
    const { rerender } = render(BaseButton, {
      ariaLabel: "Close",
      tooltipText: "Close the dialog",
    });
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Close");
    await rerender({ ariaLabel: undefined });
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
      "Close the dialog",
    );
  });

  test("does not set aria-label when the button has a label", () => {
    render(BaseButton, { label: "Save", ariaLabel: "Save the file" });
    expect(screen.getByRole("button").hasAttribute("aria-label")).toBe(false);
  });

  test("gives the name to the link when href is set", () => {
    render(BaseButton, { href: "https://example.com/", ariaLabel: "Home" });
    expect(screen.getByRole("link").getAttribute("aria-label")).toBe("Home");
  });

  test("renders a single link and no button when href is set", async () => {
    const onclick = vi.fn();
    render(BaseButton, {
      href: "https://example.com/",
      ariaLabel: "GitHub",
      openNewTab: true,
      onclick,
    });
    expect(screen.queryByRole("button")).toBeNull();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    const link = screen.getByRole("link", { name: "GitHub" });
    expect(link.getAttribute("href")).toBe("https://example.com/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
    await fireEvent.click(link);
    expect(onclick).toHaveBeenCalledOnce();
  });

  test("does not open a new tab by default when href is set", () => {
    render(BaseButton, { label: "Home", href: "/" });
    const link = screen.getByRole("link", { name: "Home" });
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.hasAttribute("rel")).toBe(false);
  });
});
