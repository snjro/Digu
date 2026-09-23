import { afterEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { NO_DATA } from "@utils/utilsCostants";
import BaseLabel from "./BaseLabel.svelte";
import { baseTextSizes } from "./baseSizes";
import { htmlSnippet, slotProps } from "../../testUtils/snippets";

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

function label(container: HTMLElement): HTMLLabelElement {
  return container.querySelector("label")!;
}

describe("BaseLabel.svelte", () => {
  test("shows the text, or NO_DATA when there is none", async () => {
    const { container, rerender } = render(BaseLabel, { text: "Name" });
    expect(label(container).textContent).toBe("Name");
    await rerender({ text: undefined });
    expect(label(container).textContent).toBe(NO_DATA);
    await rerender({ text: "Other" });
    expect(label(container).textContent).toBe("Other");
  });

  test("links to the input by inputId", () => {
    const { container } = render(BaseLabel, { text: "Name", inputId: "id1" });
    expect(label(container).getAttribute("for")).toBe("id1");
  });

  test("uses the text size and updates it", async () => {
    const { container, rerender } = render(BaseLabel, {
      text: "Name",
      textSize: "sm",
    });
    expect(label(container).classList.contains(baseTextSizes.sm)).toBe(true);
    await rerender({ textSize: "xl" });
    expect(label(container).classList.contains(baseTextSizes.xl)).toBe(true);
  });

  test("uses the colors and follows the theme", async () => {
    const { container } = render(BaseLabel, {
      text: "Name",
      colorCategoryFront: "secondary",
      colorCategoryBg: "primary",
    });
    const light = colorDefinitions.light;
    expect(label(container).classList.contains(light.secondary.text)).toBe(
      true,
    );
    expect(label(container).classList.contains(light.primary.bg)).toBe(true);
    storeUserSettings.updateState({ themeColor: "dark" });
    await Promise.resolve();
    const dark = colorDefinitions.dark;
    expect(label(container).classList.contains(dark.secondary.text)).toBe(true);
    expect(label(container).classList.contains(dark.primary.bg)).toBe(true);
  });

  test("renders the default slot after the text", () => {
    const { container } = render(BaseLabel, {
      text: "Name",
      ...slotProps({ children: htmlSnippet("<b data-testid='extra'>!</b>") }),
    });
    expect(label(container).contains(screen.getByTestId("extra"))).toBe(true);
    expect(label(container).textContent).toBe("Name!");
  });

  test("shows the icons and the copy button", () => {
    const { container } = render(BaseLabel, {
      text: "Name",
      prefixIcon: { name: "openInNew" },
      suffixIcon: { name: "download" },
      showCopyButton: true,
    });
    expect(container.querySelector("svg#openInNew")).not.toBeNull();
    expect(container.querySelector("svg#download")).not.toBeNull();
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
