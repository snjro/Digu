import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseCheckbox from "./BaseCheckbox.svelte";
import BaseCheckboxTestHost from "./BaseCheckbox.testHost.svelte";

function getCheckbox(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="checkbox"]');
  if (!input) throw new Error("no checkbox");
  return input as HTMLInputElement;
}

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseCheckbox.svelte", () => {
  test("shows checked, unchecked and indeterminate, and follows the props", async () => {
    const light = colorDefinitions.light;
    const { container, rerender } = render(BaseCheckbox, { checked: true });
    const input = getCheckbox(container);
    expect(input.checked).toBe(true);
    expect(input.classList.contains(light.success.bg)).toBe(true);
    expect(input.getAttribute("style")).toContain("checkboxChecked.svg");

    await rerender({ checked: false });
    expect(input.checked).toBe(false);
    expect(input.classList.contains(light.error.bg)).toBe(true);
    expect(input.getAttribute("style")).toContain("checkboxCross.svg");

    await rerender({ indeterminate: true });
    expect(input.indeterminate).toBe(true);
    expect(input.classList.contains("bg-yellow-500")).toBe(true);
    expect(input.getAttribute("style")).toContain("checkboxIndeterminate.svg");
  });

  test("flips on a click and calls onclick with the event", async () => {
    const onclick = vi.fn();
    const { container } = render(BaseCheckbox, { checked: false, onclick });
    const input = getCheckbox(container);

    await fireEvent.click(input);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(onclick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    expect(input.checked).toBe(true);
    expect(input.classList.contains(colorDefinitions.light.success.bg)).toBe(
      true,
    );
  });

  test("sends checked back to the parent (bind:checked)", async () => {
    const { container } = render(BaseCheckboxTestHost, { checked: false });
    await fireEvent.click(getCheckbox(container));
    expect(screen.getByTestId("bound-checked").textContent).toBe("true");
  });

  test("is checked when group has value, and updates group (bind:group)", async () => {
    const { container } = render(BaseCheckboxTestHost, {
      group: ["a", "b"],
      value: "a",
    });
    const input = getCheckbox(container);
    expect(input.checked).toBe(true);

    await fireEvent.click(input);
    expect(screen.getByTestId("bound-group").textContent).toBe("b");

    await fireEvent.click(input);
    expect(screen.getByTestId("bound-group").textContent).toBe("b,a");
  });

  test("shows the disabled state", async () => {
    const { container, rerender } = render(BaseCheckbox, { checked: false });
    const input = getCheckbox(container);
    expect(input.disabled).toBe(false);
    await rerender({ disabled: true });
    expect(input.disabled).toBe(true);
  });

  test("follows the theme in storeUserSettings", async () => {
    const { container } = render(BaseCheckbox, { checked: true });
    const input = getCheckbox(container);
    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(input.classList.contains(colorDefinitions.dark.success.bg)).toBe(
      true,
    );
  });
});
