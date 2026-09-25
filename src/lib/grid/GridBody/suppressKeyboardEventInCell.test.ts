import { beforeEach, describe, expect, test } from "vitest";
import type { SuppressKeyboardEventParams } from "ag-grid-community";
import { suppressKeyboardEventInCell } from "./suppressKeyboardEventInCell";

let cell: HTMLElement;
let link: HTMLAnchorElement;
let button: HTMLButtonElement;

function press(
  target: HTMLElement,
  key: string,
  shiftKey = false,
): { suppressed: boolean; event: KeyboardEvent } {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey,
    cancelable: true,
  });
  Object.defineProperty(event, "target", { value: target });
  const suppressed = suppressKeyboardEventInCell({
    event,
  } as SuppressKeyboardEventParams);
  return { suppressed, event };
}

beforeEach(() => {
  document.body.innerHTML =
    '<div class="ag-cell" tabindex="-1"><a href="https://example.invalid/">x</a><button>Copy</button></div>' +
    '<div class="ag-cell" tabindex="-1" id="plain">text</div>';
  cell = document.querySelector(".ag-cell")!;
  link = cell.querySelector("a")!;
  button = cell.querySelector("button")!;
});

describe("suppressKeyboardEventInCell", () => {
  test("Tab on the cell and on a child that is not the last is left to the browser", () => {
    expect(press(cell, "Tab").suppressed).toBe(true);
    expect(press(link, "Tab").suppressed).toBe(true);
  });

  test("Tab on the last child is left to ag-grid", () => {
    expect(press(button, "Tab").suppressed).toBe(false);
  });

  test("Shift+Tab on the cell focuses its last child", () => {
    const { suppressed, event } = press(cell, "Tab", true);
    expect(suppressed).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  test("Shift+Tab goes back through the children, then is left to ag-grid", () => {
    expect(press(button, "Tab", true).suppressed).toBe(true);
    expect(press(link, "Tab", true).suppressed).toBe(false);
  });

  test("Enter on a child is left to the browser, Enter on the cell to ag-grid", () => {
    expect(press(button, "Enter").suppressed).toBe(true);
    expect(press(link, "Enter").suppressed).toBe(true);
    expect(press(cell, "Enter").suppressed).toBe(false);
  });

  test("a cell without focusable children and other keys are left to ag-grid", () => {
    const plain = document.getElementById("plain")!;
    expect(press(plain, "Tab").suppressed).toBe(false);
    expect(press(plain, "Tab", true).suppressed).toBe(false);
    expect(press(plain, "Enter").suppressed).toBe(false);
    expect(press(button, "ArrowRight").suppressed).toBe(false);
  });
});
