import { afterEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseTooltip from "./BaseTooltip.svelte";
import { htmlSnippet, slotProps } from "../../testUtils/snippets";

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

const children = () =>
  slotProps({ children: htmlSnippet("<b data-testid='child'>child</b>") });

describe("BaseTooltip.svelte", () => {
  test("shows the text next to the default slot", () => {
    render(BaseTooltip, { text: "Tip", ...children() });
    const tip = screen.getByText("Tip");
    expect(tip.tagName).toBe("SPAN");
    expect(tip.parentElement!.contains(screen.getByTestId("child"))).toBe(true);
  });

  test("shows only the default slot when there is no text", async () => {
    const { rerender } = render(BaseTooltip, {
      text: undefined,
      ...children(),
    });
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.queryByText("Tip")).toBeNull();
    await rerender({ text: "Tip" });
    expect(screen.getByText("Tip")).toBeTruthy();
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  test("places the text by xPosition and yPosition", async () => {
    const { rerender } = render(BaseTooltip, { text: "Tip", ...children() });
    const tip = () => screen.getByText("Tip");
    expect(tip().classList.contains("left-full")).toBe(true);
    expect(tip().classList.contains("bottom-full")).toBe(true);
    await rerender({ xPosition: "left", yPosition: "bottom" });
    expect(tip().classList.contains("right-full")).toBe(true);
    expect(tip().classList.contains("top-full")).toBe(true);
  });

  test("keeps the same color classes in both themes", async () => {
    render(BaseTooltip, { text: "Tip", ...children() });
    const category = colorSettings.tooltip;
    const tip = screen.getByText("Tip");
    expect(tip.classList.contains(colorClasses[category].bg)).toBe(true);
    storeUserSettings.updateState({ themeColor: "dark" });
    await Promise.resolve();
    expect(tip.classList.contains(colorClasses[category].bg)).toBe(true);
  });
});
