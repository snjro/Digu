import type { ActionReturn } from "svelte/action";

const FOCUSABLE_SELECTOR: string =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Lets keyboard users scroll the box, but adds the tab stop only while its content overflows.
export function focusableWhenScrolling(
  node: HTMLElement,
  label: string,
): ActionReturn<string> {
  let currentLabel: string = label;
  let frame: number | undefined;

  const update = (): void => {
    frame = undefined;
    const scrolls: boolean =
      node.scrollWidth > node.clientWidth ||
      node.scrollHeight > node.clientHeight;
    // A link or button inside already lets the keyboard scroll the box.
    const hasFocusable: boolean =
      node.querySelector(FOCUSABLE_SELECTOR) !== null;
    if (scrolls && !hasFocusable) {
      node.tabIndex = 0;
      node.setAttribute("role", "region");
      node.setAttribute("aria-label", currentLabel);
    } else {
      node.removeAttribute("tabindex");
      node.removeAttribute("role");
      node.removeAttribute("aria-label");
    }
  };
  const scheduleUpdate = (): void => {
    frame ??= requestAnimationFrame(update);
  };

  update();
  if (
    typeof ResizeObserver === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return {};
  }
  // The box does not change size when only its content grows, so watch both.
  const resizeObserver = new ResizeObserver(scheduleUpdate);
  resizeObserver.observe(node);
  if (node.firstElementChild) resizeObserver.observe(node.firstElementChild);
  const mutationObserver = new MutationObserver(scheduleUpdate);
  mutationObserver.observe(node, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return {
    update(newLabel: string) {
      currentLabel = newLabel;
      update();
    },
    destroy() {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    },
  };
}
