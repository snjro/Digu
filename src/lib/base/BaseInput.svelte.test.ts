import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseInput from "./BaseInput.svelte";
import BaseInputTestHost from "./BaseInput.testHost.svelte";
import { htmlSnippet, slotProps } from "../../testUtils/snippets";

const baseProps = {
  type: "text",
  colorCategory: "primary",
  colorCategoryBorder: "secondary",
} as const;

function getInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector("input");
  if (!input) throw new Error("no input");
  return input;
}

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseInput.svelte", () => {
  test("shows the props, and follows them when they change", async () => {
    const { container, rerender } = render(BaseInput, {
      ...baseProps,
      value: "first",
      placeholder: "Type here",
    });
    const input = getInput(container);
    expect(input.value).toBe("first");
    expect(input.type).toBe("text");
    expect(input.placeholder).toBe("Type here");
    expect(input.disabled).toBe(false);

    await rerender({
      ...baseProps,
      value: "second",
      placeholder: "Other",
      disabled: true,
    });
    expect(input.value).toBe("second");
    expect(input.placeholder).toBe("Other");
    expect(input.disabled).toBe(true);
  });

  test("has the name of ariaLabel, and no name without it", () => {
    render(BaseInput, { ...baseProps, ariaLabel: "Bulk Unit" });
    expect(screen.getByRole("textbox", { name: "Bulk Unit" })).toBeTruthy();
    const { container } = render(BaseInput, { ...baseProps });
    expect(getInput(container).hasAttribute("aria-label")).toBe(false);
  });

  test("shows an empty value when value is undefined", () => {
    const { container } = render(BaseInput, { ...baseProps });
    expect(getInput(container).value).toBe("");
  });

  test("sends the typed value back to the parent (bind:value)", async () => {
    const { container } = render(BaseInputTestHost, { value: "a" });
    await fireEvent.input(getInput(container), { target: { value: "abc" } });
    expect(screen.getByTestId("bound").textContent).toBe("abc");
  });

  test("calls onchange, onfocus and onblur with the events", async () => {
    const onchange = vi.fn();
    const onfocus = vi.fn();
    const onblur = vi.fn();
    const { container } = render(BaseInput, {
      ...baseProps,
      onchange,
      onfocus,
      onblur,
    });
    const input = getInput(container);

    await fireEvent.focus(input);
    expect(onfocus).toHaveBeenCalledTimes(1);
    expect(onfocus.mock.calls[0][0]).toBeInstanceOf(FocusEvent);

    await fireEvent.change(input, { target: { value: "x" } });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0].target).toBe(input);

    await fireEvent.blur(input);
    expect(onblur).toHaveBeenCalledTimes(1);
    expect(onblur.mock.calls[0][0]).toBeInstanceOf(FocusEvent);
  });

  test("hides the placeholder and uses the interactive border while focused", async () => {
    const { container } = render(BaseInput, {
      ...baseProps,
      placeholder: "Type here",
    });
    const input = getInput(container);
    const frame = input.parentElement as HTMLElement;
    expect(frame.classList.contains(colorClasses.secondary.border)).toBe(true);

    await fireEvent.focus(input);
    expect(input.hasAttribute("placeholder")).toBe(false);
    expect(frame.classList.contains(colorClasses.interactive.border)).toBe(
      true,
    );

    await fireEvent.blur(input);
    expect(input.placeholder).toBe("Type here");
    expect(frame.classList.contains(colorClasses.secondary.border)).toBe(true);
  });

  test("keeps the same color classes in both themes", async () => {
    const { container } = render(BaseInput, { ...baseProps });
    const input = getInput(container);
    expect(input.classList.contains(colorClasses.primary.text)).toBe(true);

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(input.classList.contains(colorClasses.primary.text)).toBe(true);
  });

  test("renders the prefixIcon and suffixIcon slots", () => {
    render(BaseInput, {
      ...baseProps,
      ...slotProps({
        prefixIcon: htmlSnippet('<span data-testid="prefix">P</span>'),
        suffixIcon: htmlSnippet('<span data-testid="suffix">S</span>'),
      }),
    });
    expect(screen.getByTestId("prefix").textContent).toBe("P");
    expect(screen.getByTestId("suffix").textContent).toBe("S");
  });

  test("renders no icon slot when none is given", () => {
    const { container } = render(BaseInput, { ...baseProps });
    const frame = getInput(container).parentElement as HTMLElement;
    expect(frame.children).toHaveLength(1);
  });

  test("shows the inputHelper slot only while helperTextState is set", async () => {
    const { rerender } = render(BaseInput, {
      ...baseProps,
      ...slotProps({
        inputHelper: htmlSnippet('<span data-testid="helper">help</span>'),
      }),
    });
    const wrapper = screen.getByTestId("helper").parentElement as HTMLElement;
    expect(wrapper.classList.contains("invisible")).toBe(true);

    await rerender({ helperTextState: "error" });
    expect(wrapper.classList.contains("invisible")).toBe(false);
  });

  test("shows the label of labelProps", () => {
    render(BaseInput, { ...baseProps, labelProps: { text: "Bulk Unit" } });
    expect(screen.getAllByText("Bulk Unit").length).toBeGreaterThan(0);
  });

  test("setValue changes the shown value", async () => {
    const { container, component } = render(BaseInput, {
      ...baseProps,
      value: "old",
    });
    component.setValue("new");
    await tick();
    expect(getInput(container).value).toBe("new");
  });
});
