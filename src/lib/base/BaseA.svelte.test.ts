import { afterEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseA from "./BaseA.svelte";
import { htmlSnippet, slotProps } from "../../testUtils/snippets";

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseA.svelte", () => {
  test("shows the href as the text when no text is given", () => {
    render(BaseA, { href: "https://example.com/" });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.com/");
    expect(link.textContent?.trim()).toBe("https://example.com/");
  });

  test("opens a new tab by default, and not when openNewTab is false", async () => {
    const { rerender } = render(BaseA, { href: "/a", text: "A" });
    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
    await rerender({ openNewTab: false });
    expect(screen.getByRole("link").hasAttribute("target")).toBe(false);
  });

  test("updates the href and the text when the props change", async () => {
    const { rerender } = render(BaseA, { href: "/a", text: "A" });
    await rerender({ href: "/b", text: "B" });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/b");
    expect(link.textContent?.trim()).toBe("B");
  });

  test("uses the color category and follows the theme", async () => {
    render(BaseA, { href: "/a", text: "A", colorCategory: "secondary" });
    const link = screen.getByRole("link");
    expect(link.classList.contains(colorDefinitions.light.secondary.text)).toBe(
      true,
    );
    storeUserSettings.updateState({ themeColor: "dark" });
    await Promise.resolve();
    expect(link.classList.contains(colorDefinitions.dark.secondary.text)).toBe(
      true,
    );
  });

  test("renders the slot anchorContent in place of the text", () => {
    render(BaseA, {
      href: "/a",
      text: "A",
      ...slotProps({
        anchorContent: htmlSnippet("<b data-testid='content'>content</b>"),
      }),
    });
    const link = screen.getByRole("link");
    expect(link.contains(screen.getByTestId("content"))).toBe(true);
    expect(screen.queryByText("A")).toBeNull();
  });

  test("shows the prefix and suffix icons", () => {
    const { container } = render(BaseA, {
      href: "/a",
      text: "A",
      prefixIcon: { name: "openInNew" },
      suffixIcon: { name: "download" },
    });
    expect(container.querySelector("svg#openInNew")).not.toBeNull();
    expect(container.querySelector("svg#download")).not.toBeNull();
  });
});
