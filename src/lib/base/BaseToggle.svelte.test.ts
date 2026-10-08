import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
import { initialDataUserSettings } from "#db/dbTypes.js";
import { storeUserSettings } from "#stores/storeUserSettings.js";
import BaseToggle from "./BaseToggle.svelte";
import BaseToggleTestHost from "./BaseToggle.testHost.svelte";

const baseProps = {
  colorCategoryTrack: "primary",
  colorCategoryThumbToggleOn: "success",
  colorCategoryThumbToggleOff: "error",
  disabled: false,
  size: "md",
} as const;

function getParts(container: HTMLElement): {
  track: HTMLButtonElement;
  thumb: HTMLElement;
} {
  const track = container.querySelector("button");
  const thumb = track?.querySelector("div.transform");
  if (!track || !thumb) throw new Error("no toggle");
  return { track, thumb: thumb as HTMLElement };
}

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseToggle.svelte", () => {
  test("places and colors the thumb by toggleValue", async () => {
    const { container, rerender } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
    });
    const { thumb } = getParts(container);
    expect(thumb.classList.contains("-translate-x-4")).toBe(true);
    expect(thumb.classList.contains(colorClasses.error.bg)).toBe(true);

    await rerender({ toggleValue: true });
    expect(thumb.classList.contains("translate-x-4")).toBe(true);
    expect(thumb.classList.contains(colorClasses.success.bg)).toBe(true);
  });

  test("flips on a click and calls ontogglechanged once", async () => {
    const ontogglechanged = vi.fn();
    const { container } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
      ontogglechanged,
    });
    const { track, thumb } = getParts(container);

    await fireEvent.click(track);
    expect(ontogglechanged).toHaveBeenCalledTimes(1);
    expect(ontogglechanged).toHaveBeenCalledWith();
    expect(thumb.classList.contains("translate-x-4")).toBe(true);

    await fireEvent.click(track);
    expect(ontogglechanged).toHaveBeenCalledTimes(2);
    expect(thumb.classList.contains("-translate-x-4")).toBe(true);
  });

  test("sends the new value back to the parent (bind:toggleValue)", async () => {
    const { container } = render(BaseToggleTestHost, { toggleValue: false });
    await fireEvent.click(getParts(container).track);
    expect(screen.getByTestId("bound").textContent).toBe("true");
  });

  test("shows the disabled state", async () => {
    const { container, rerender } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
    });
    const { track, thumb } = getParts(container);
    expect(track.disabled).toBe(false);
    expect(track.classList.contains("cursor-pointer")).toBe(true);

    await rerender({ disabled: true });
    expect(track.disabled).toBe(true);
    expect(track.classList.contains("cursor-not-allowed")).toBe(true);
    expect(thumb.classList.contains("contrast-50")).toBe(true);
  });

  test("is a switch named by ariaLabel, else by the tooltip", async () => {
    const { container, rerender } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
      tooltipText: "start sync",
    });
    const { track } = getParts(container);
    expect(track.getAttribute("role")).toBe("switch");
    expect(track.getAttribute("aria-checked")).toBe("false");
    expect(track.getAttribute("aria-label")).toBe("start sync");

    await rerender({ toggleValue: true, ariaLabel: "Sync" });
    expect(track.getAttribute("aria-checked")).toBe("true");
    expect(track.getAttribute("aria-label")).toBe("Sync");
  });

  test("is described by the tooltip only when it has a name of its own", async () => {
    const { container, rerender } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
      tooltipText: "start sync",
    });
    const { track } = getParts(container);
    expect(track.hasAttribute("aria-describedby")).toBe(false);

    await rerender({ ariaLabel: "Sync" });
    const id = track.getAttribute("aria-describedby");
    expect(id && document.getElementById(id)?.textContent.trim()).toBe(
      "start sync",
    );
    expect(screen.getByRole("switch", { name: "Sync" })).toBe(track);

    await rerender({ tooltipText: undefined });
    expect(track.hasAttribute("aria-describedby")).toBe(false);
  });

  test("keeps the same color classes in both themes", async () => {
    const { container } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
    });
    const { track } = getParts(container);
    expect(track.classList.contains(colorClasses.primary.bg)).toBe(true);

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(track.classList.contains(colorClasses.primary.bg)).toBe(true);
  });
});
