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

// Runs in the page, and gives the functions that find and read the elements
// there. inPage() hands them to one evaluate, so that a check reads the
// toggle together with what else it reads.
function pageLib(syncToggleSelector, oldSyncToggleTexts) {
  const visible = (e) => e.getClientRects().length > 0;
  // The button next to a leaf element with one of `texts`: from the text, the
  // first element around it that has a button. The search from that text
  // stops there, also when the button is hidden.
  function buttonNearText(texts) {
    const labels = [...document.querySelectorAll("*")].filter(
      (e) => e.children.length === 0 && texts.includes(e.textContent.trim()),
    );
    for (const label of labels) {
      for (let e = label; e; e = e.parentElement) {
        const b = e.querySelector("button");
        if (b) {
          if (visible(b)) return b;
          break;
        }
      }
    }
    return null;
  }
  // With `oldTexts`, a build without the name is searched by the tooltips of
  // v1.0.2; only for the older builds.
  function syncToggle(oldTexts) {
    const named = [...document.querySelectorAll(syncToggleSelector)].find(
      visible,
    );
    if (named || !oldTexts) return named ?? null;
    return buttonNearText(oldSyncToggleTexts);
  }
  // `checked` is null in a build without aria-checked. The tooltip is the
  // description of the toggle; a build before #661 has it only as the text
  // of the button.
  function readToggle(b) {
    const checked = b.getAttribute("aria-checked");
    const describedBy = b.getAttribute("aria-describedby");
    return {
      checked: checked === null ? null : checked === "true",
      disabled: b.disabled,
      pulse: !!b.closest('[class~="motion-safe:animate-pulse"]'),
      tooltip: describedBy
        ? (document.getElementById(describedBy)?.textContent.trim() ?? null)
        : checked === null
          ? b.textContent.trim()
          : null,
    };
  }
  function findToggle(oldTexts) {
    const b = syncToggle(oldTexts);
    return b && readToggle(b);
  }
  return { buttonNearText, syncToggle, readToggle, findToggle };
}

function pageLibHandle(page) {
  return page.evaluateHandle(pageLib, SYNC_TOGGLE, OLD_SYNC_TOGGLE_TEXTS);
}

// Runs `fn(lib, ...args)` in the page, where `lib` has the functions of
// pageLib().
export async function inPage(page, fn, ...args) {
  const lib = await pageLibHandle(page);
  try {
    return await page.evaluate(fn, lib, ...args);
  } finally {
    await lib.dispose();
  }
}

// { checked, disabled, pulse, tooltip } of the sync toggle, or null. The
// tooltip is for the records.
export async function findToggle(page, { oldTexts = false } = {}) {
  return inPage(page, (lib, oldTexts) => lib.findToggle(oldTexts), oldTexts);
}

// Clicks the sync toggle with the mouse. It throws when the toggle is not
// found or is disabled, so the scenario ends as ERROR. When the state can
// change by itself before the click, use clickToggleIf().
export async function clickToggle(page, { oldTexts = false } = {}) {
  const lib = await pageLibHandle(page);
  let h;
  try {
    h = await page.evaluateHandle(
      (lib, oldTexts) => lib.syncToggle(oldTexts),
      lib,
      oldTexts,
    );
    const el = h.asElement();
    if (!el) throw new Error("No sync toggle");
    const toggle = await page.evaluate((lib, b) => lib.readToggle(b), lib, el);
    if (toggle.disabled)
      throw new Error(`The sync toggle is disabled: ${JSON.stringify(toggle)}`);
    await el.click();
  } finally {
    await h?.dispose();
    await lib.dispose();
  }
}

// Clicks the sync toggle in the page when each field of `state` (such as
// { checked: true, disabled: false }) is the one of the toggle. The state is
// read and the toggle clicked in one step, so a sync that stopped by itself
// in between is not started again. Returns whether it clicked.
export async function clickToggleIf(page, state, { oldTexts = false } = {}) {
  return inPage(
    page,
    (lib, state, oldTexts) => {
      const b = lib.syncToggle(oldTexts);
      if (!b) return false;
      const toggle = lib.readToggle(b);
      if (!Object.entries(state).every(([k, v]) => toggle[k] === v))
        return false;
      b.click();
      return true;
    },
    state,
    oldTexts,
  );
}

export async function openSyncPanel(page) {
  await page.click(SYNC_PANEL_BUTTON);
  await page.waitForSelector("#sync-panel:not(.hidden)");
}

// Types `text` into `target` (a selector or an element handle) and leaves it
// with Tab. Without `clear`, the text is selected and typed over. With it, the
// input is clicked, emptied with Backspace, and `text` may be empty.
export async function typeInto(page, target, text, { clear = false } = {}) {
  if (typeof target === "string") {
    if (clear) await page.click(target, { clickCount: 3 });
    else await page.focus(target);
  } else if (clear) await target.click({ clickCount: 3 });
  else await target.focus();
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
  const clicked = await inPage(
    page,
    (lib, text) => {
      const b = lib.buttonNearText([text]);
      b?.click();
      return !!b;
    },
    text,
  );
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
