import { afterEach, describe, expect, test } from "vitest";
import { tick } from "svelte";
import { render, screen } from "@testing-library/svelte";
import BaseTableRow from "./BaseTableRow.svelte";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

// themeColors.css gives this class the bgHover color of each theme.
const hoverClass: string =
  colorClasses[colorSettings.itemMemberTableBg].bgHover;

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
    expect(getRow(container).classList).toContain(hoverClass);

    await rerender({ hoverEffect: false });
    expect(getRow(container).classList).not.toContain(hoverClass);

    await rerender({ hoverEffect: true });
    expect(getRow(container).classList).toContain(hoverClass);
  });

  test("keeps the same class in both themes; the CSS changes the color", async () => {
    const { container } = render(BaseTableRow, {});
    expect(getRow(container).classList).toContain(hoverClass);

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(getRow(container).classList).toContain(hoverClass);
  });
});
