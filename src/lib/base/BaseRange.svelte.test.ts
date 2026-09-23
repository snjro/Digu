import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseRange from "./BaseRange.svelte";
import BaseRangeTestHost from "./BaseRange.testHost.svelte";

const baseProps = { min: 0, max: 100, step: 10, value: 30 };

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseRange.svelte", () => {
  test("shows the props, and follows them when they change", async () => {
    const { rerender } = render(BaseRange, { ...baseProps });
    const range = screen.getByRole("slider") as HTMLInputElement;
    expect(range.min).toBe("0");
    expect(range.max).toBe("100");
    expect(range.step).toBe("10");
    expect(range.value).toBe("30");
    expect(range.disabled).toBe(false);
    expect(range.classList.contains("cursor-pointer")).toBe(true);

    await rerender({ value: 70, disabled: true });
    expect(range.value).toBe("70");
    expect(range.disabled).toBe(true);
    expect(range.classList.contains("cursor-not-allowed")).toBe(true);
  });

  test("calls onchange with the event", async () => {
    const onchange = vi.fn();
    render(BaseRange, { ...baseProps, onchange });
    const range = screen.getByRole("slider");
    await fireEvent.change(range, { target: { value: "50" } });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0].target).toBe(range);
  });

  test("sends the value back to the parent (bind:value)", async () => {
    render(BaseRangeTestHost, { value: 30 });
    await fireEvent.input(screen.getByRole("slider"), {
      target: { value: "60" },
    });
    expect(screen.getByTestId("bound").textContent).toBe("60");
  });

  test("follows the theme in storeUserSettings", async () => {
    render(BaseRange, { ...baseProps, colorCategoryFront: "interactive" });
    const range = screen.getByRole("slider");
    expect(
      range.classList.contains(colorDefinitions.light.interactive.accent),
    ).toBe(true);
    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(
      range.classList.contains(colorDefinitions.dark.interactive.accent),
    ).toBe(true);
  });
});
