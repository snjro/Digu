import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import RpcConfigChangerInput from "./RpcConfigChangerInput.svelte";

function getInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="number"]');
  if (!input) throw new Error("no input");
  return input as HTMLInputElement;
}

describe("RpcConfigChangerInput.svelte", () => {
  test("shows the value and follows the props", async () => {
    const { container, rerender } = render(RpcConfigChangerInput, {
      value: 100,
      disabled: false,
      helperTextState: undefined,
    });
    const input = getInput(container);
    expect(input.value).toBe("100");
    expect(input.disabled).toBe(false);

    await rerender({ value: 200, disabled: true });
    expect(input.value).toBe("200");
    expect(input.disabled).toBe(true);
  });

  test("calls onchange with the typed number", async () => {
    const onchange = vi.fn();
    const { container } = render(RpcConfigChangerInput, {
      value: 100,
      disabled: false,
      helperTextState: undefined,
      onchange,
    });
    await fireEvent.change(getInput(container), { target: { value: "250" } });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith(250);
  });

  test("calls onchange on focus when the shown value differs from value", async () => {
    const onchange = vi.fn();
    const { container } = render(RpcConfigChangerInput, {
      value: 100,
      disabled: false,
      helperTextState: undefined,
      onchange,
    });
    const input = getInput(container);

    await fireEvent.focus(input);
    expect(onchange).not.toHaveBeenCalled();

    input.value = "300";
    await fireEvent.focus(input);
    expect(onchange).toHaveBeenCalledWith(300);
  });

  // Not rendered disabled with an error from the start: the component then
  // calls setValue before bind:this is set, which is a known issue.
  test("shows value again when disabled with an error", async () => {
    const { container, rerender } = render(RpcConfigChangerInput, {
      value: 100,
      disabled: false,
      helperTextState: undefined,
    });
    const input = getInput(container);
    await fireEvent.input(input, { target: { value: "7" } });
    expect(input.value).toBe("7");

    await rerender({ value: 100, disabled: true, helperTextState: "error" });
    expect(input.value).toBe("100");
  });
});
