import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
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
    expect(thumb.classList.contains(colorDefinitions.light.error.bg)).toBe(
      true,
    );

    await rerender({ toggleValue: true });
    expect(thumb.classList.contains("translate-x-4")).toBe(true);
    expect(thumb.classList.contains(colorDefinitions.light.success.bg)).toBe(
      true,
    );
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

  test("follows the theme in storeUserSettings", async () => {
    const { container } = render(BaseToggle, {
      ...baseProps,
      toggleValue: false,
    });
    const { track } = getParts(container);
    expect(track.classList.contains(colorDefinitions.light.primary.bg)).toBe(
      true,
    );

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(track.classList.contains(colorDefinitions.dark.primary.bg)).toBe(
      true,
    );
  });
});
