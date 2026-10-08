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
  // The first visible element of `selector`, or null.
  function visibleElement(selector) {
    return [...document.querySelectorAll(selector)].find(visible) ?? null;
  }
  // The visible checkboxes with the aria-label `label`.
  function checkboxes(label) {
    return [
      ...document.querySelectorAll(`input[aria-label="${CSS.escape(label)}"]`),
    ].filter(visible);
  }
  // Clicks the `index`-th of checkboxes(label) when it is enabled. Returns the
  // checkbox, how many there are and whether it clicked.
  function clickCheckbox(label, index) {
    const boxes = checkboxes(label);
    const box = boxes.at(index) ?? null;
    const clicked = !!box && !box.disabled;
    if (clicked) box.click();
    return { box, count: boxes.length, clicked };
  }
  // With `oldTexts`, a build without the name is searched by the tooltips of
  // v1.0.2; only for the older builds.
  function syncToggle(oldTexts) {
    const named = visibleElement(syncToggleSelector);
    if (named || !oldTexts) return named;
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
    visibleElement,
    checkboxes,
    clickCheckbox,
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

// Waits until `fn(lib, ...args)` (see inPage), the `what` of the page, is not
// disabled, and with `handle` gives its handle. It throws at once when there is
// none, and after ENABLED_TIMEOUT_MS when it stays disabled, with
// `detail(lib, ...args)` of the page when it is given.
async function waitEnabled(
  page,
  what,
  fn,
  args,
  { detail, handle = false } = {},
) {
  const found = await page
    .waitForFunction(
      `((e) => (!e || !e.disabled) && { e })(${inPageSource(fn, args)})`,
      { timeout: ENABLED_TIMEOUT_MS, polling: 100 },
    )
    .catch(async (error) => {
      if (error.name !== "TimeoutError") throw error;
      const seen = detail
        ? `: ${JSON.stringify(await inPage(page, detail, ...args))}`
        : "";
      throw new Error(`The ${what} is disabled${seen}`);
    });
  try {
    if (!(await found.evaluate(({ e }) => !!e))) throw new Error(`No ${what}`);
    if (handle) return (await found.getProperty("e")).asElement();
  } finally {
    await found.dispose();
  }
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
  const b = await waitEnabled(
    page,
    "sync toggle",
    (lib, oldTexts) => lib.syncToggle(oldTexts),
    [oldTexts],
    { detail: (lib, oldTexts) => lib.findToggle(oldTexts), handle: true },
  );
  try {
    await b.click();
  } finally {
    await b.dispose();
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
// given by a selector is the visible one, typed into once it is enabled, and it
// throws when the input stays disabled; one given by a handle is not waited
// for. It throws when the input does not have `text` before the Tab (the app
// may change the value when it saves it).
export async function typeInto(page, target, text, { clear = false } = {}) {
  const isSelector = typeof target === "string";
  if (!isSelector && !target) throw new Error("No element to type into");
  const el = isSelector
    ? await waitEnabled(
        page,
        target,
        (lib, selector) => lib.visibleElement(selector),
        [target],
        { handle: true },
      )
    : target;
  try {
    if (clear) await el.click({ clickCount: 3 });
    else await el.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    if (clear) await page.keyboard.press("Backspace");
    if (text) await page.keyboard.type(text);
    const value = await el.evaluate((e) => e.value);
    if (value !== text)
      throw new Error(
        `Typed "${text}" into ${isSelector ? target : "an input"}, which has "${value}"`,
      );
  } finally {
    if (el !== target) await el.dispose();
  }
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
// in the sidebar is first, the one in the page last), once it is enabled. The
// page checks it and clicks it in one evaluate, so a checkbox disabled in
// between is not clicked: then it throws, as when it stays disabled or is not
// found. `checked` is read after `after()`, such as a settle of the caller.
// Returns { count, checked }.
export async function clickCheckbox(
  page,
  label,
  { index = -1, after = async () => {} } = {},
) {
  const what = `checkbox ${label}`;
  await waitEnabled(
    page,
    what,
    (lib, label, index) => lib.checkboxes(label).at(index),
    [label, index],
  );
  const h = await page.evaluateHandle(
    inPageSource(
      (lib, label, index) => lib.clickCheckbox(label, index),
      [label, index],
    ),
  );
  try {
    const { count, clicked } = await h.evaluate(({ count, clicked }) => ({
      count,
      clicked,
    }));
    if (!clicked)
      throw new Error(
        count ? `The ${what} is disabled at the click` : `No ${what}`,
      );
    const clickedBox = await h.getProperty("box");
    try {
      await after();
      return { count, checked: await clickedBox.evaluate((e) => e.checked) };
    } finally {
      await clickedBox.dispose();
    }
  } finally {
    await h.dispose();
  }
}
