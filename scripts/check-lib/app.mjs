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
// there. inPage() runs them in one evaluate with the caller's function, so
// that a check reads the toggle together with what else it reads.
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
  // The visible checkboxes with the aria-label `label`.
  function checkboxes(label) {
    return [
      ...document.querySelectorAll(`input[aria-label="${label}"]`),
    ].filter(visible);
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
  // description of the toggle, or the text of the button in a build without
  // the description; null when it is empty.
  function readToggle(b) {
    const checked = b.getAttribute("aria-checked");
    const describedBy = b.getAttribute("aria-describedby");
    return {
      checked: checked === null ? null : checked === "true",
      disabled: b.disabled,
      pulse: !!b.closest('[class~="motion-safe:animate-pulse"]'),
      tooltip:
        (describedBy
          ? document.getElementById(describedBy)
          : b
        )?.textContent.trim() || null,
    };
  }
  function findToggle(oldTexts) {
    const b = syncToggle(oldTexts);
    return b && readToggle(b);
  }
  // The toggle `b`, its state, and whether each field of `state` (such as
  // { checked: true, disabled: false }) is the one of the toggle.
  function toggleIf(state, oldTexts) {
    const b = syncToggle(oldTexts);
    const toggle = b && readToggle(b);
    const ok =
      !!toggle && Object.entries(state).every(([k, v]) => toggle[k] === v);
    return { b, toggle, ok };
  }
  // Clicks the toggle when `state` holds, and returns whether it clicked.
  function clickToggleIf(state, oldTexts) {
    const { b, ok } = toggleIf(state, oldTexts);
    if (ok) b.click();
    return ok;
  }
  return {
    buttonNearText,
    checkboxes,
    syncToggle,
    readToggle,
    findToggle,
    toggleIf,
    clickToggleIf,
  };
}
const PAGE_LIB = `(${pageLib})(${JSON.stringify(SYNC_TOGGLE)}, ${JSON.stringify(OLD_SYNC_TOGGLE_TEXTS)})`;

// The source of `fn(lib, ...args)`, where `lib` has the functions of
// pageLib(). The page runs both in one evaluate, so a navigation cannot come
// in between.
function inPageSource(fn, args) {
  const values = args.map((a) =>
    a === undefined ? "undefined" : JSON.stringify(a),
  );
  return `(${fn})(${[PAGE_LIB, ...values].join(", ")})`;
}

// Runs `fn(lib, ...args)` in the page (see inPageSource) and gives its value.
// `fn` is an arrow function or a function expression, which goes to the page
// as its source; the args are JSON values (no handle or BigInt).
export async function inPage(page, fn, ...args) {
  return page.evaluate(inPageSource(fn, args));
}

// How long a click or typing waits for its control to be enabled. Opening a
// chain starts the warp sync, which holds the sync lock (and so disables the
// sync targets and the RPC input) while it fetches the manifest and reads the
// DB (warpSync.ts).
// Where the checks use them, the manifest gets 404, so that is short, but on a
// slow CI runner it outlasted the settle (#757); 30 s leaves a wide margin.
const ENABLED_TIMEOUT_MS = 30000;

// Waits until `fn(lib, ...args)` (see inPage) gives an element that is not
// disabled. After ENABLED_TIMEOUT_MS it returns, and the caller throws with
// what it finds.
async function waitEnabled(page, fn, ...args) {
  await page
    .waitForFunction(`((e) => !!e && !e.disabled)(${inPageSource(fn, args)})`, {
      timeout: ENABLED_TIMEOUT_MS,
      polling: 100,
    })
    .then(
      (h) => h.dispose(),
      (error) => {
        if (error.name !== "TimeoutError") throw error;
      },
    );
}

// { checked, disabled, pulse, tooltip } of the sync toggle, or null. The
// tooltip is for the records.
export async function findToggle(page, { oldTexts = false } = {}) {
  return inPage(page, (lib, oldTexts) => lib.findToggle(oldTexts), oldTexts);
}

// Clicks the sync toggle with the mouse, as a person does, once it is enabled.
// It throws when the toggle is not found or stays disabled, so the scenario
// ends as ERROR. When the state can change by itself before the click, use
// clickToggleIf().
export async function clickToggle(page, { oldTexts = false } = {}) {
  await waitEnabled(
    page,
    (lib, oldTexts) => lib.syncToggle(oldTexts),
    oldTexts,
  );
  const h = await page.evaluateHandle(
    inPageSource(
      (lib, oldTexts) => lib.toggleIf({ disabled: false }, oldTexts),
      [oldTexts],
    ),
  );
  try {
    const { toggle, ok } = await h.evaluate(({ toggle, ok }) => ({
      toggle,
      ok,
    }));
    if (!toggle) throw new Error("No sync toggle");
    if (!ok)
      throw new Error(`The sync toggle is disabled: ${JSON.stringify(toggle)}`);
    const b = await h.getProperty("b");
    try {
      await b.asElement().click();
    } finally {
      await b.dispose();
    }
  } finally {
    await h.dispose();
  }
}

// Clicks the sync toggle in the page when each field of `state` (such as
// { checked: true, disabled: false }) is the one of the toggle. The state is
// read and the toggle clicked in one evaluate, so a sync that stopped by
// itself in between is not started again. Returns whether it clicked. A
// caller that needs an enabled toggle says { disabled: false }.
export async function clickToggleIf(page, state, { oldTexts = false } = {}) {
  return inPage(
    page,
    (lib, state, oldTexts) => lib.clickToggleIf(state, oldTexts),
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
// input is clicked, emptied with Backspace, and `text` may be empty. An input
// given by a selector is typed into once it is enabled, and it throws when the
// input stays disabled; one given by a handle is not waited for.
export async function typeInto(page, target, text, { clear = false } = {}) {
  const isSelector = typeof target === "string";
  if (isSelector)
    await waitEnabled(
      page,
      (lib, selector) => document.querySelector(selector),
      target,
    );
  const el = isSelector ? await page.$(target) : target;
  if (!el)
    throw new Error(isSelector ? `No ${target}` : "No element to type into");
  try {
    if (isSelector && (await el.evaluate((e) => e.disabled)))
      throw new Error(`${target} is disabled`);
    if (clear) await el.click({ clickCount: 3 });
    else await el.focus();
  } finally {
    if (el !== target) await el.dispose();
  }
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
// in the sidebar is first, the one in the page last), once it is enabled. It
// throws when the checkbox is not found or stays disabled, as clickToggle()
// does. `checked` is read after `after()`, such as a settle of the caller.
// Returns { count, checked }.
export async function clickCheckbox(
  page,
  label,
  { index = -1, after = async () => {} } = {},
) {
  await waitEnabled(
    page,
    (lib, label, index) => lib.checkboxes(label).at(index),
    label,
    index,
  );
  const boxes = await page.evaluateHandle(
    inPageSource((lib, label) => lib.checkboxes(label), [label]),
  );
  try {
    const { count, disabled } = await boxes.evaluate(
      (boxes, index) => ({
        count: boxes.length,
        disabled: boxes.at(index)?.disabled,
      }),
      index,
    );
    if (!count) throw new Error(`No checkbox ${label}`);
    if (disabled) throw new Error(`The checkbox ${label} is disabled`);
    const h = await boxes.evaluateHandle(
      (boxes, index) => boxes.at(index),
      index,
    );
    try {
      await h.asElement().click();
      await after();
      return { count, checked: await h.evaluate((e) => e.checked) };
    } finally {
      await h.dispose();
    }
  } finally {
    await boxes.dispose();
  }
}
