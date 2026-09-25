import type { SuppressKeyboardEventParams } from "ag-grid-community";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * For colDef.suppressKeyboardEvent. ag-grid moves Tab from cell to cell, so the
 * buttons and links in a cell renderer are never focused. Let Tab walk through
 * them first, and leave the key to ag-grid on the cell's last (Shift+Tab: first)
 * one. Enter on them is left to the browser: ag-grid's Enter re-creates the
 * cell renderer before the click.
 */
export function suppressKeyboardEventInCell({
  event,
}: SuppressKeyboardEventParams): boolean {
  if (!(event.target instanceof HTMLElement)) {
    return false;
  }
  const cell = event.target.closest<HTMLElement>(".ag-cell");
  if (!cell) {
    return false;
  }
  if (event.key === "Enter") {
    return event.target !== cell;
  }
  if (event.key !== "Tab") {
    return false;
  }
  const focusables = [...cell.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (focusables.length === 0) {
    return false;
  }
  const index = focusables.indexOf(event.target);
  if (event.shiftKey) {
    if (event.target === cell) {
      event.preventDefault();
      focusables[focusables.length - 1].focus();
      return true;
    }
    return index > 0;
  }
  // From the cell itself the browser moves to its first focusable element.
  return index < focusables.length - 1;
}
