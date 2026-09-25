import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import RpcConfigChangerInput from "./RpcConfigChangerInput.svelte";
import type { RpcConfigParam } from "./rpcConfigParams";

const rpcConfigParam: RpcConfigParam = {
  name: "bulkUnit",
  label: "Bulk Unit",
  minValue: 1,
  maxValue: 10000,
  step: 1,
};

function getInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="number"]');
  if (!input) throw new Error("no input");
  return input as HTMLInputElement;
}

describe("RpcConfigChangerInput.svelte", () => {
  test("shows the value and follows the props", async () => {
    const { container, rerender } = render(RpcConfigChangerInput, {
      rpcConfigParam,
      value: 100,
      disabled: false,
      helperTextState: undefined,
    });
    const input = getInput(container);
    expect(input.value).toBe("100");
    expect(input.disabled).toBe(false);
    expect(input.getAttribute("aria-label")).toBe("Bulk Unit");

    await rerender({ value: 200, disabled: true });
    expect(input.value).toBe("200");
    expect(input.disabled).toBe(true);
  });

  test("calls onchange with the typed number", async () => {
    const onchange = vi.fn();
    const { container } = render(RpcConfigChangerInput, {
      rpcConfigParam,
      value: 100,
      disabled: false,
      helperTextState: undefined,
      onchange,
    });
    await fireEvent.change(getInput(container), { target: { value: "250" } });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith(250);
  });

  test.each([
    ["1e3", 1000],
    ["1.5", 1.5],
  ])(
    "calls onchange with %j read as a number, not cut to an integer",
    async (typed, expected) => {
      const onchange = vi.fn();
      const { container } = render(RpcConfigChangerInput, {
        rpcConfigParam,
        value: 100,
        disabled: false,
        helperTextState: undefined,
        onchange,
      });
      await fireEvent.change(getInput(container), { target: { value: typed } });
      expect(onchange).toHaveBeenCalledWith(expected);
    },
  );

  test("does not call onchange on focus after the typed value is changed", async () => {
    const onchange = vi.fn();
    const { container } = render(RpcConfigChangerInput, {
      rpcConfigParam,
      value: 100,
      disabled: false,
      helperTextState: undefined,
      onchange,
    });
    const input = getInput(container);
    await fireEvent.input(input, { target: { value: "250" } });
    await fireEvent.change(input);
    expect(onchange).toHaveBeenCalledTimes(1);

    await fireEvent.blur(input);
    await fireEvent.focus(input);
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  test("calls onchange with NaN for an empty input, and not again on focus", async () => {
    const onchange = vi.fn();
    const { container } = render(RpcConfigChangerInput, {
      rpcConfigParam,
      value: 100,
      disabled: false,
      helperTextState: undefined,
      onchange,
    });
    const input = getInput(container);
    await fireEvent.input(input, { target: { value: "" } });
    await fireEvent.change(input);
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith(NaN);

    await fireEvent.blur(input);
    await fireEvent.focus(input);
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  test("calls onchange on focus when the shown value differs from value", async () => {
    const onchange = vi.fn();
    const { container } = render(RpcConfigChangerInput, {
      rpcConfigParam,
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

  test("shows value again when disabled with an error", async () => {
    const { container, rerender } = render(RpcConfigChangerInput, {
      rpcConfigParam,
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

  test("shows the value when created disabled with an error", () => {
    const { container } = render(RpcConfigChangerInput, {
      rpcConfigParam,
      value: 100,
      disabled: true,
      helperTextState: "error",
    });
    expect(getInput(container).value).toBe("100");
  });
});
