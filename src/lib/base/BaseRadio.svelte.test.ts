import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseRadio, { type RadioLabelAndValues } from "./BaseRadio.svelte";
import BaseRadioTestHost from "./BaseRadio.testHost.svelte";

const labelAndValues: RadioLabelAndValues<string> = [
  { labelText: "Yes", value: "yes", inputId: "radio-yes" },
  { labelText: "No", value: "no", inputId: "radio-no" },
];

const baseProps = {
  groupName: "group",
  size: "md",
  labelAndValues,
} as const;

function radio(id: string): HTMLInputElement {
  const input = document.getElementById(id);
  if (!input) throw new Error(`no ${id}`);
  return input as HTMLInputElement;
}

function button(label: string): HTMLButtonElement {
  const found = screen.getByText(label).closest("button");
  if (!found) throw new Error(`no button ${label}`);
  return found;
}

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseRadio.svelte (button)", () => {
  test("checks the selected value and underlines its label", async () => {
    const { rerender } = render(BaseRadio, {
      ...baseProps,
      radioButtonType: "button",
      selectedValue: "yes",
    });
    const underline = colorDefinitions.light.interactive.border;
    expect(radio("radio-yes").checked).toBe(true);
    expect(radio("radio-no").checked).toBe(false);
    expect(
      screen.getByText("Yes").parentElement?.classList.contains(underline),
    ).toBe(true);
    expect(
      screen
        .getByText("No")
        .parentElement?.classList.contains("border-transparent"),
    ).toBe(true);

    await rerender({ selectedValue: "no" });
    expect(radio("radio-no").checked).toBe(true);
    expect(
      screen.getByText("No").parentElement?.classList.contains(underline),
    ).toBe(true);
  });

  test("calls onchanged with the clicked value", async () => {
    const onchanged = vi.fn();
    render(BaseRadio, {
      ...baseProps,
      radioButtonType: "button",
      selectedValue: "yes",
      onchanged,
    });
    await fireEvent.click(button("No"));
    expect(onchanged).toHaveBeenCalledTimes(1);
    expect(onchanged).toHaveBeenCalledWith("no");
    expect(radio("radio-no").checked).toBe(true);
  });

  test("sends the clicked value back to the parent (bind:selectedValue)", async () => {
    render(BaseRadioTestHost, {
      radioButtonType: "button",
      labelAndValues,
      selectedValue: "yes",
    });
    await fireEvent.click(button("No"));
    expect(screen.getByTestId("bound").textContent).toBe("no");
  });

  test("disables the inputs and the buttons", () => {
    render(BaseRadio, {
      ...baseProps,
      radioButtonType: "tab",
      selectedValue: "yes",
      disabled: true,
    });
    expect(radio("radio-yes").disabled).toBe(true);
    expect(button("Yes").disabled).toBe(true);
    expect(button("No").disabled).toBe(true);
  });
});

describe("BaseRadio.svelte (circle)", () => {
  test("shows the labels and checks the selected value", async () => {
    const { rerender } = render(BaseRadio, {
      ...baseProps,
      radioButtonType: "circle",
      selectedValue: "no",
    });
    expect(screen.getByText("Yes")).toBeTruthy();
    expect(radio("radio-no").checked).toBe(true);

    await rerender({ selectedValue: "yes" });
    expect(radio("radio-yes").checked).toBe(true);
  });

  test("sends the clicked value back to the parent (bind:selectedValue)", async () => {
    render(BaseRadioTestHost, {
      radioButtonType: "circle",
      labelAndValues,
      selectedValue: "yes",
    });
    await fireEvent.click(radio("radio-no"));
    expect(screen.getByTestId("bound").textContent).toBe("no");
  });
});
