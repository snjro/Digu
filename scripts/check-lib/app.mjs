// What the browser checks look for in the app, and how they use it
// (scripts/screen-check, visual-compare and a11y-scan). Find an element by its
// name (aria-label), role or attributes, not by a text that changes with a
// state (scripts/screen-check/README.md). It imports nothing, like browser.mjs.

export const SIDEBAR = "aside[aria-label=Sidebar]";
export const CLOSE_SIDEBAR = 'button[aria-label="Close sidebar"]';
// The RPC input has no placeholder while it has the focus (BaseInput.svelte),
// and the placeholder became http://localhost:8545 in #459.
export const RPC_INPUT = 'input[aria-label="RPC URL"]';
export const QUICK_SEARCH = 'main input[aria-label="Quick search"]';
// The progress in the nav, which opens the sync panel (#596).
export const SYNC_PANEL_BUTTON = 'nav button[aria-controls="sync-panel"]';
export const SYNC_TOGGLE = 'button[role="switch"][aria-label="Sync"]';
// The builds before #661 have no name on the sync toggle. These are its
// tooltips in v1.0.2, the oldest build the checks open.
const OLD_SYNC_TOGGLE_TEXTS = ["start sync", "stop sync"];

// Runs in the page.
function syncToggleIn(selector, oldTexts) {
  const visible = (e) => e.getClientRects().length > 0;
  const named = [...document.querySelectorAll(selector)].find(visible);
  if (named || !oldTexts) return named ?? null;
  const labels = [...document.querySelectorAll("*")].filter(
    (e) => e.children.length === 0 && oldTexts.includes(e.textContent.trim()),
  );
  for (const label of labels) {
    for (let e = label; e; e = e.parentElement) {
      const b = e.querySelector("button");
      if (b && visible(b)) return b;
    }
  }
  return null;
}
// Runs in the page. `checked` is null in a build without aria-checked.
function readToggle(b) {
  const checked = b.getAttribute("aria-checked");
  return {
    checked: checked === null ? null : checked === "true",
    disabled: b.disabled,
    pulse: !!b.closest('[class~="motion-safe:animate-pulse"]'),
    tooltip: b.textContent.trim(),
  };
}

// The handle of the sync toggle, or null. With `oldTexts`, a build without
// the name is searched by the tooltips of v1.0.2; only for the older builds.
export async function syncToggleHandle(page, { oldTexts = false } = {}) {
  const h = await page.evaluateHandle(
    syncToggleIn,
    SYNC_TOGGLE,
    oldTexts ? OLD_SYNC_TOGGLE_TEXTS : null,
  );
  const el = h.asElement();
  if (!el) await h.dispose();
  return el;
}

// { checked, disabled, pulse, tooltip } of the sync toggle, or null. The
// tooltip is for the records.
export async function findToggle(page, options) {
  const el = await syncToggleHandle(page, options);
  if (!el) return null;
  try {
    return await el.evaluate(readToggle);
  } finally {
    await el.dispose();
  }
}

// Clicks the sync toggle. It throws when the toggle is not found or is
// disabled, so the scenario ends as ERROR.
export async function clickToggle(page, options) {
  const el = await syncToggleHandle(page, options);
  if (!el) throw new Error("No sync toggle");
  try {
    const toggle = await el.evaluate(readToggle);
    if (toggle.disabled)
      throw new Error(`The sync toggle is disabled: ${JSON.stringify(toggle)}`);
    await el.click();
  } finally {
    await el.dispose();
  }
}

export async function openSyncPanel(page) {
  await page.click(SYNC_PANEL_BUTTON);
  await page.waitForSelector("#sync-panel:not(.hidden)");
}

// Types `text` into `target` (a selector or an element handle) and leaves it
// with Tab. Without `clear`, the text is selected and typed over. With it, the
// input is clicked, emptied with Backspace, and `text` may be empty.
export async function typeInto(page, target, text, { clear = false } = {}) {
  const el = typeof target === "string" ? await page.$(target) : target;
  if (!el) throw new Error(`No ${target}`);
  if (clear) await el.click({ clickCount: 3 });
  else await el.focus();
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  if (clear) await page.keyboard.press("Backspace");
  if (text) await page.keyboard.type(text);
  await page.keyboard.press("Tab");
}

// Clicks the visible button that has the tooltip `text`, in the page. The
// same buttons are also in the "three dots" menu, which is hidden.
export async function clickByTooltip(page, text) {
  const clicked = await page.evaluate((text) => {
    const isVisible = (e) => e.getClientRects().length > 0;
    const labels = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && e.textContent.trim() === text,
    );
    for (const label of labels) {
      for (let e = label; e; e = e.parentElement) {
        const button = e.querySelector("button");
        if (button) {
          if (!isVisible(button)) break;
          button.click();
          return true;
        }
      }
    }
    return false;
  }, text);
  if (!clicked) throw new Error(`No visible button with the tooltip "${text}"`);
}

// Clicks the `index`-th visible checkbox with the aria-label `label` (the one
// in the sidebar is first, the one in the page last). `checked` is read after
// `after()`, such as a settle of the caller. Returns { count, checked }.
export async function clickCheckbox(
  page,
  label,
  { index = -1, after = async () => {} } = {},
) {
  const visible = [];
  for (const h of await page.$$(`input[aria-label="${label}"]`))
    if (await h.evaluate((e) => e.getClientRects().length > 0)) visible.push(h);
  if (!visible.length) throw new Error(`No checkbox ${label}`);
  const h = visible.at(index);
  await h.click();
  await after();
  return { count: visible.length, checked: await h.evaluate((e) => e.checked) };
}
