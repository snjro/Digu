import { afterEach, describe, expect, test } from "vitest";
import { tick } from "svelte";
import { render, screen } from "@testing-library/svelte";
import BaseTableRow from "./BaseTableRow.svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

const hoverClass = (theme: "light" | "dark"): string =>
  colorDefinitions[theme][colorSettings.itemMemberTableBg].bgHover;

function getRow(container: HTMLElement): HTMLTableRowElement {
  const row = container.querySelector("tr");
  if (!row) throw new Error("no <tr>");
  return row;
}

describe("BaseTableRow.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("renders the default slot inside the row", () => {
    const { container } = render(BaseTableRow, {
      ...slotProps({ children: htmlSnippet("<td>cell text</td>") }),
    });
    expect(getRow(container).contains(screen.getByText("cell text"))).toBe(
      true,
    );
  });

  test("adds the hover background only when hoverEffect is true", async () => {
    const { container, rerender } = render(BaseTableRow, {
      hoverEffect: true,
    });
    expect(getRow(container).classList).toContain(hoverClass("light"));

    await rerender({ hoverEffect: false });
    expect(getRow(container).classList).not.toContain(hoverClass("light"));

    await rerender({ hoverEffect: true });
    expect(getRow(container).classList).toContain(hoverClass("light"));
  });

  test("follows the theme in storeUserSettings", async () => {
    const { container } = render(BaseTableRow, {});
    expect(getRow(container).classList).toContain(hoverClass("light"));

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(getRow(container).classList).toContain(hoverClass("dark"));
    expect(getRow(container).classList).not.toContain(hoverClass("light"));
  });
});
