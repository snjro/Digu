import { afterEach, describe, expect, test } from "vitest";
import { tick } from "svelte";
import { render, screen } from "@testing-library/svelte";
import BaseTable from "./BaseTable.svelte";
import type { BaseTableHeaderCellProps } from "./BaseTableHeaderCell.svelte";
import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
import { initialDataUserSettings } from "@db/dbTypes";
import { storeUserSettings } from "@stores/storeUserSettings";
import { htmlSnippet, slotProps } from "../../../testUtils/snippets";

const headerCells: BaseTableHeaderCellProps[] = [
  { text: "Name", textSize: "md", align: "left" },
  { text: "Value", textSize: "md", align: "right" },
];

function getTable(container: HTMLElement): HTMLTableElement {
  const table = container.querySelector("table");
  if (!table) throw new Error("no <table>");
  return table;
}
function headerTexts(container: HTMLElement): string[] {
  return [...container.querySelectorAll("thead th")].map(
    (th) => th.textContent?.trim() ?? "",
  );
}
function sequenceHeader(container: HTMLElement): HTMLTableCellElement {
  const th = container.querySelector("thead th");
  if (!th || th.textContent?.trim() !== "#") throw new Error("no # header");
  return th as HTMLTableCellElement;
}

describe("BaseTable.svelte", () => {
  afterEach(() => {
    storeUserSettings.set({ ...initialDataUserSettings });
  });

  test("renders the header cells after the # header", () => {
    const { container } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 2,
    });
    expect(headerTexts(container)).toEqual(["#", "Name", "Value"]);
  });

  test("hides the # header when showSequenceNumbers is false", async () => {
    const { container, rerender } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 2,
      showSequenceNumbers: false,
    });
    expect(headerTexts(container)).toEqual(["Name", "Value"]);

    await rerender({ showSequenceNumbers: true });
    expect(headerTexts(container)).toEqual(["#", "Name", "Value"]);
  });

  test("updates the header cells when the prop changes", async () => {
    const { container, rerender } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 2,
    });
    await rerender({
      tableHeaderCellProps: [{ text: "Only", textSize: "md", align: "left" }],
    });
    expect(headerTexts(container)).toEqual(["#", "Only"]);
  });

  test.each([
    [9, "w-6"],
    [10, "w-8"],
    [100, "w-10"],
    [1000, "w-12"],
  ])("numOfTableRows=%i gives the # header %s", (numOfTableRows, width) => {
    const { container } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows,
    });
    expect(sequenceHeader(container).classList).toContain(width);
  });

  test("widens the # header when numOfTableRows grows", async () => {
    const { container, rerender } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 5,
    });
    expect(sequenceHeader(container).classList).toContain("w-6");

    await rerender({ numOfTableRows: 150 });
    expect(sequenceHeader(container).classList).toContain("w-10");
    expect(sequenceHeader(container).classList).not.toContain("w-6");
  });

  test("renders the tableBody slot inside tbody", () => {
    const { container } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 1,
      ...slotProps({
        tableBody: htmlSnippet("<tr><td>body cell</td></tr>"),
      }),
    });
    const tbody = container.querySelector("tbody");
    expect(tbody?.contains(screen.getByText("body cell"))).toBe(true);
  });

  test("adds the borders given by the props", async () => {
    const { container, rerender } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 1,
    });
    const classList = () => getTable(container).classList;
    expect(classList()).not.toContain("border-x");
    expect(classList()).not.toContain("border-t");
    expect(classList()).not.toContain("border-b");

    await rerender({ borderX: true, borderTop: true, borderBottom: true });
    expect(classList()).toContain("border-x");
    expect(classList()).toContain("border-t");
    expect(classList()).toContain("border-b");
  });

  test("follows the theme in storeUserSettings", async () => {
    const { container } = render(BaseTable, {
      tableHeaderCellProps: headerCells,
      textSize: "md",
      numOfTableRows: 1,
    });
    const category = colorSettings.itemMemberTableBorder;
    expect(getTable(container).classList).toContain(
      colorDefinitions.light[category].border,
    );

    storeUserSettings.updateState({ themeColor: "dark" });
    await tick();
    expect(getTable(container).classList).toContain(
      colorDefinitions.dark[category].border,
    );
  });
});
