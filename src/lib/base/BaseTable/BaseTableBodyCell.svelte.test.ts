import { afterEach, describe, expect, test } from "vitest";
import { tick } from "svelte";
import { render, screen } from "@testing-library/svelte";
import BaseTableBodyCell from "./BaseTableBodyCell.svelte";
import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

function getCell(container: HTMLElement): HTMLTableCellElement {
  const cell = container.querySelector("td");
  if (!cell) throw new Error("no <td>");
  return cell;
}
function getAlignBox(container: HTMLElement): HTMLElement {
  return getCell(container).firstElementChild as HTMLElement;
}

describe("BaseTableBodyCell.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("shows the text and updates it when the prop changes", async () => {
    const { rerender } = render(BaseTableBodyCell, {
      text: "value 1",
      textSize: "md",
      align: "left",
    });
    expect(screen.getByText("value 1")).toBeTruthy();

    await rerender({ text: "value 2" });
    expect(screen.queryByText("value 1")).toBeNull();
    expect(screen.getByText("value 2")).toBeTruthy();
  });

  test("renders no label when there is no text", () => {
    const { container } = render(BaseTableBodyCell, {
      textSize: "md",
      align: "left",
    });
    expect(getCell(container).querySelector("label")).toBeNull();
  });

  test.each([
    ["left", "justify-start"],
    ["center", "justify-center"],
    ["right", "justify-end"],
    ["stretch", "justify-stretch"],
  ] as const)("align=%s gives %s", (align, expected) => {
    const { container } = render(BaseTableBodyCell, {
      textSize: "md",
      align,
    });
    expect(getAlignBox(container).classList).toContain(expected);
  });

  test("uses font-mono only when fontMono is true", async () => {
    const { container, rerender } = render(BaseTableBodyCell, {
      textSize: "md",
      align: "left",
    });
    expect(getCell(container).classList).not.toContain("font-mono");

    await rerender({ fontMono: true });
    expect(getCell(container).classList).toContain("font-mono");
  });

  test("shows the right border only when showBorderRight is true", async () => {
    const { container, rerender } = render(BaseTableBodyCell, {
      textSize: "md",
      align: "left",
      showBorderRight: true,
    });
    expect(getCell(container).classList).toContain("border-r");

    await rerender({ showBorderRight: false });
    expect(getCell(container).classList).not.toContain("border-r");
  });

  test("uses inherit colors without color categories", () => {
    const { container } = render(BaseTableBodyCell, {
      textSize: "md",
      align: "left",
    });
    const classList = getCell(container).classList;
    expect(classList).toContain("bg-inherit");
    expect(classList).toContain("text-inherit");
    expect(classList).toContain("border-inherit");
  });

  test("uses the colors of the categories in both themes", async () => {
    const { container, rerender } = render(BaseTableBodyCell, {
      textSize: "md",
      align: "left",
      colorCategoryBg: "primary",
      colorCategoryFront: "secondary",
      colorCategoryBorder: "interactive",
    });
    expect(getCell(container).classList).toContain(colorClasses.primary.bg);
    expect(getCell(container).classList).toContain(colorClasses.secondary.text);
    expect(getCell(container).classList).toContain(
      colorClasses.interactive.border,
    );

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(getCell(container).classList).toContain(colorClasses.primary.bg);

    await rerender({ colorCategoryBg: "error" });
    expect(getCell(container).classList).toContain(colorClasses.error.bg);
    expect(getCell(container).classList).not.toContain(colorClasses.primary.bg);
  });

  test("renders the default slot", () => {
    const { container } = render(BaseTableBodyCell, {
      textSize: "md",
      align: "left",
      ...slotProps({ children: htmlSnippet("<span>slot content</span>") }),
    });
    expect(getCell(container).contains(screen.getByText("slot content"))).toBe(
      true,
    );
  });
});
