import { afterEach, describe, expect, test } from "vitest";
import { tick } from "svelte";
import { render, screen } from "@testing-library/svelte";
import BaseTableHeaderCell from "./BaseTableHeaderCell.svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

function getCell(container: HTMLElement): HTMLTableCellElement {
  const cell = container.querySelector("th");
  if (!cell) throw new Error("no <th>");
  return cell;
}
function getAlignBox(container: HTMLElement): HTMLElement {
  return getCell(container).firstElementChild as HTMLElement;
}

describe("BaseTableHeaderCell.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("shows the text and updates it when the prop changes", async () => {
    const { rerender } = render(BaseTableHeaderCell, {
      text: "Header A",
      textSize: "md",
      align: "left",
    });
    expect(screen.getByText("Header A")).toBeTruthy();

    await rerender({ text: "Header B" });
    expect(screen.queryByText("Header A")).toBeNull();
    expect(screen.getByText("Header B")).toBeTruthy();
  });

  test("renders no label when there is no text", () => {
    const { container } = render(BaseTableHeaderCell, {
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
    const { container } = render(BaseTableHeaderCell, {
      textSize: "md",
      align,
    });
    expect(getAlignBox(container).classList).toContain(expected);
  });

  test("uses width w-full by default and follows the width prop", async () => {
    const { container, rerender } = render(BaseTableHeaderCell, {
      textSize: "md",
      align: "left",
    });
    expect(getCell(container).classList).toContain("w-full");

    await rerender({ width: "w-10" });
    expect(getCell(container).classList).toContain("w-10");
    expect(getCell(container).classList).not.toContain("w-full");
  });

  test("shows the right border only when showBorderRight is true", async () => {
    const { container, rerender } = render(BaseTableHeaderCell, {
      textSize: "md",
      align: "left",
    });
    expect(getCell(container).classList).not.toContain("border-r");

    await rerender({ showBorderRight: true });
    expect(getCell(container).classList).toContain("border-r");
  });

  test("uses inherit colors without color categories", () => {
    const { container } = render(BaseTableHeaderCell, {
      textSize: "md",
      align: "left",
    });
    const classList = getCell(container).classList;
    expect(classList).toContain("bg-inherit");
    expect(classList).toContain("text-inherit");
    expect(classList).toContain("border-inherit");
  });

  test("uses the colors of the categories and follows the theme", async () => {
    const { container } = render(BaseTableHeaderCell, {
      textSize: "md",
      align: "left",
      colorCategoryBg: "primary",
      colorCategoryFront: "secondary",
      colorCategoryBorder: "interactive",
    });
    const light = colorDefinitions.light;
    expect(getCell(container).classList).toContain(light.primary.bg);
    expect(getCell(container).classList).toContain(light.secondary.text);
    expect(getCell(container).classList).toContain(light.interactive.border);

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    const dark = colorDefinitions.dark;
    expect(getCell(container).classList).toContain(dark.primary.bg);
    expect(getCell(container).classList).toContain(dark.secondary.text);
    expect(getCell(container).classList).toContain(dark.interactive.border);
  });

  test("renders the default slot", () => {
    const { container } = render(BaseTableHeaderCell, {
      textSize: "md",
      align: "left",
      ...slotProps({ children: htmlSnippet("<span>slot content</span>") }),
    });
    expect(getCell(container).contains(screen.getByText("slot content"))).toBe(
      true,
    );
  });
});
