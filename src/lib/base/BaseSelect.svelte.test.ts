import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import BaseSelect from "./BaseSelect.svelte";
import BaseSelectTestHost from "./BaseSelect.testHost.svelte";

const items = [
  { name: "Ethereum", value: "eth" },
  { name: "Polygon", value: "matic" },
];

afterEach(() => {
  storeUserSettings.set({ ...initialDataUserSettings });
});

describe("BaseSelect.svelte", () => {
  test("shows the items and the selected value, and follows the props", async () => {
    const { rerender } = render(BaseSelect, {
      items,
      value: "matic",
      size: "md",
    });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(
      screen.getAllByRole("option").map((o) => o.textContent?.trim()),
    ).toEqual(["Ethereum", "Polygon"]);
    expect(select.value).toBe("matic");

    await rerender({ value: "eth" });
    expect(select.value).toBe("eth");

    await rerender({ items: [...items, { name: "Base", value: "base" }] });
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  test("has the name of ariaLabel, and no name without it", () => {
    const { unmount } = render(BaseSelect, {
      items,
      value: "eth",
      size: "md",
      ariaLabel: "Chain",
    });
    expect(screen.getByRole("combobox", { name: "Chain" })).toBeTruthy();
    unmount();
    render(BaseSelect, { items, value: "eth", size: "md" });
    expect(screen.getByRole("combobox").hasAttribute("aria-label")).toBe(false);
  });

  test("calls onchange with the event", async () => {
    const onchange = vi.fn();
    render(BaseSelect, { items, value: "eth", size: "md", onchange });
    const select = screen.getByRole("combobox");
    await fireEvent.change(select, { target: { value: "matic" } });
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0].target).toBe(select);
  });

  test("sends the selected value back to the parent (bind:value)", async () => {
    // happy-dom does not match `option:checked`, which the binding reads, and
    // the binding then falls back to the first option. So select the first.
    render(BaseSelectTestHost, { items, value: "matic" });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    select.value = "eth";
    await fireEvent.change(select);
    expect(screen.getByTestId("bound").textContent).toBe("eth");
  });

  test("follows the theme in storeUserSettings", async () => {
    render(BaseSelect, {
      items,
      value: "eth",
      size: "md",
      colorCategoryBg: "primary",
    });
    const select = screen.getByRole("combobox");
    expect(select.classList.contains(colorDefinitions.light.primary.bg)).toBe(
      true,
    );
    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(select.classList.contains(colorDefinitions.dark.primary.bg)).toBe(
      true,
    );
  });
});
