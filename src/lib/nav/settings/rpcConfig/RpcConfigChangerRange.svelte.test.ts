import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import RpcConfigChangerRange from "./RpcConfigChangerRange.svelte";
import type { RpcConfigParam } from "./rpcConfigParams";

const rpcConfigParam: RpcConfigParam = {
  name: "bulkUnit",
  label: "Bulk Unit",
  minValue: 1,
  maxValue: 10000,
  step: 1,
};

describe("RpcConfigChangerRange.svelte", () => {
  test("uses the range of rpcConfigParam and follows value", async () => {
    const { rerender } = render(RpcConfigChangerRange, {
      rpcConfigParam,
      disabled: false,
      value: 100,
    });
    const range = screen.getByRole("slider", {
      name: "Bulk Unit slider",
    }) as HTMLInputElement;
    expect(range.min).toBe("1");
    expect(range.max).toBe("10000");
    expect(range.step).toBe("1");
    expect(range.value).toBe("100");
    expect(range.disabled).toBe(false);

    await rerender({ value: 500, disabled: true });
    expect(range.value).toBe("500");
    expect(range.disabled).toBe(true);
  });

  test("calls onchange with the new number", async () => {
    const onchange = vi.fn();
    render(RpcConfigChangerRange, {
      rpcConfigParam,
      disabled: false,
      value: 100,
      onchange,
    });
    await fireEvent.change(screen.getByRole("slider"), {
      target: { value: "4000" },
    });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith(4000);
  });
});
