// Takes screenshots of a built app (`npm run build`) with the Chrome of puppeteer.
// Usage (in the test service): node shots.mjs <buildDir> <outDir>
// See README.md in this folder.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");
const { Interface, id: keccak256Text } = require("ethers");

const [buildDir, outDir] = process.argv.slice(2);
if (!buildDir || !outDir) {
  console.error("Usage: node shots.mjs <buildDir> <outDir>");
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const VIEWPORT = { width: 1400, height: 900 };
const NARROW_VIEWPORT = { width: 760, height: 900 };
const PHONE_VIEWPORT = { width: 390, height: 844 };

// Pages are served as `xxx/index.html` (trailingSlash "always"), and their
// assets are relative, so each URL ends with "/".
const EVENTS = "/eth/Augur-version1/contracts/Augur/events/";
const PAGES = [
  ["home", "/"],
  ["chain", "/eth/"],
  ["version", "/eth/Augur-version1/"],
  ["contracts", "/eth/Augur-version1/contracts/"],
  ["contract", "/eth/Augur-version1/contracts/Augur/"],
  ["events", EVENTS],
  ["event", `${EVENTS}MarketCreated/`],
  ["functions", "/eth/Augur-version1/contracts/Augur/functions/"],
  [
    "function",
    "/eth/Augur-version1/contracts/Augur/functions/createChildUniverse-0x8892bb73/",
  ],
];
const VERSION = "/eth/Augur-version1/";
// Screens after an action. Each starts from a fresh browser profile, so that
// what an action saves in IndexedDB (settings, the chain) does not carry over.
// With `keepMouse`, the mouse stays where the action put it (for hover).
const STATES = [
  ["settings", EVENTS, (page) => clickByTooltip(page, "Settings")],
  ["export-csv", EVENTS, (page) => clickByTooltip(page, "Export as CSV")],
  [
    "quick-search",
    EVENTS,
    async (page) => {
      await page.type('input[placeholder="Quick search..."]', "Market");
    },
  ],
  [
    "sidebar-version2",
    EVENTS,
    async (page) => {
      await (await accordionArrow(page, "Augur version2")).click();
    },
  ],
  // GitHub Pages has no page for an unknown URL, so +error.svelte is
  // shown only after a navigation inside the app.
  [
    "error",
    "/",
    async (page) => {
      await page.evaluate(() => {
        const link = document.createElement("a");
        link.href = "/no-such-chain/";
        document.body.append(link);
        link.click();
      });
      await page.waitForFunction(() => location.pathname === "/no-such-chain/");
    },
  ],
  [
    "narrow",
    EVENTS,
    async (page) => {
      await page.setViewport(NARROW_VIEWPORT);
    },
  ],
  [
    "export-csv-row-number-no",
    EVENTS,
    async (page) => {
      await clickByTooltip(page, "Export as CSV");
      await settle(page);
      // The first "No" is the one of "Row number".
      await clickByText(page, "No");
    },
  ],
  [
    "settings-close",
    EVENTS,
    async (page) => {
      await clickByTooltip(page, "Settings");
      await settle(page);
      await page.click("dialog[open] button");
    },
  ],
  [
    "settings-escape",
    EVENTS,
    async (page) => {
      await clickByTooltip(page, "Settings");
      await settle(page);
      await page.keyboard.press("Escape");
    },
  ],
  [
    "settings-range",
    EVENTS,
    async (page) => {
      await clickByTooltip(page, "Settings");
      await settle(page);
      await page.$eval('dialog[open] input[type="range"]', (range) => {
        range.value = range.max;
        range.dispatchEvent(new Event("input", { bubbles: true }));
        range.dispatchEvent(new Event("change", { bubbles: true }));
      });
    },
  ],
  ["settings-input", EVENTS, (page) => typeSetting(page, "250")],
  ["settings-input-error", EVENTS, (page) => typeSetting(page, "0")],
  [
    "hover-sidebar-item",
    EVENTS,
    async (page) => {
      await hover(page, await buttonByText(page, "Cash"));
    },
    { keepMouse: true },
  ],
  [
    "hover-accordion-arrow",
    EVENTS,
    async (page) => {
      await hover(page, await accordionArrow(page, "Augur version2"));
    },
    { keepMouse: true },
  ],
  [
    "accordion-enter",
    EVENTS,
    async (page) => {
      await (await accordionArrow(page, "Augur version2")).focus();
      await page.keyboard.press("Enter");
    },
  ],
  [
    "select-chain",
    EVENTS,
    async (page) => {
      const value = await page.$eval(
        "select",
        (select) =>
          [...select.options].find((o) => o.textContent.includes("Polygon"))
            .value,
      );
      await page.select("select", value);
    },
  ],
  [
    "version-sync-target",
    VERSION,
    async (page) => {
      await page.evaluate(() => {
        const row = [...document.querySelectorAll("tr")].find((e) =>
          e.innerText.includes("LegacyReputationToken"),
        );
        row.querySelector('input[type="checkbox"]').click();
      });
    },
  ],
  [
    "quick-search-clear",
    EVENTS,
    async (page) => {
      await page.type('input[placeholder="Quick search..."]', "Market");
      await settle(page);
      await clickByTooltip(page, "clear");
    },
  ],
  [
    "narrow-three-dots",
    EVENTS,
    async (page) => {
      await page.setViewport(NARROW_VIEWPORT);
      await settle(page);
      await openThreeDots(page, "Settings");
    },
  ],
  [
    "narrow-three-dots-settings",
    EVENTS,
    async (page) => {
      await page.setViewport(NARROW_VIEWPORT);
      await settle(page);
      await openThreeDots(page, "Settings");
      await settle(page);
      await clickByText(page, "Settings");
    },
  ],
  // There is no RPC, so the sync does not start.
  ["sync-toggle", EVENTS, (page) => clickByTooltip(page, "start sync")],
];

const CONTRACT = "/eth/Augur-version1/contracts/Augur/";
const EVENT = `${EVENTS}MarketCreated/`;
const FUNCTION =
  "/eth/Augur-version1/contracts/Augur/functions/createChildUniverse-0x8892bb73/";
// A function with a tuple parameter, which has a "Components of ..." dialog.
const TUPLE_FUNCTION =
  "/matic/Augur-turbo/contracts/SportsLinkMarketFactory/functions/getMarketDetails-0xb06c1ba3/";
// More screens after an action, taken like STATES. The options:
// - `hover`: in a browser with a mouse. Headless Chrome answers
//   `(hover: none)`, so the Tailwind `hover:` classes do not apply without it.
// - `keepMouse`: as in STATES.
const MORE_STATES = [
  ["contract-abi", `${CONTRACT}#abi`, (page) => expectTab(page, "ABI")],
  ["event-abi", `${EVENT}#abi`, (page) => expectTab(page, "ABI")],
  ["function-abi", `${FUNCTION}#abi`, (page) => expectTab(page, "ABI")],
  [
    "components-dialog",
    TUPLE_FUNCTION,
    async (page) => {
      await clickByText(page, "View");
      await page.waitForSelector("dialog[open]");
    },
  ],
  [
    "abi-params-dialog",
    EVENTS,
    async (page) => {
      // The number of inputs of the first event that has some.
      const button = await page.evaluateHandle(() =>
        [...document.querySelectorAll(".ag-cell button")].find((e) =>
          /^[1-9]\d*$/.test(e.innerText.trim()),
        ),
      );
      if (!button.asElement()) throw new Error("No ABI params button");
      await button.click();
      await page.waitForSelector("dialog[open]");
    },
  ],
  [
    "hover-grid-row",
    EVENTS,
    async (page) => {
      await hover(page, await visible(page, ".ag-row:not(.ag-header-row)", 1));
      await page.waitForSelector(".ag-row-hover");
    },
    { hover: true, keepMouse: true },
  ],
  [
    "hover-table-row",
    VERSION,
    async (page) => {
      await hover(page, await visible(page, "tbody tr", 0));
    },
    { hover: true, keepMouse: true },
  ],
  [
    "hover-button",
    EVENT,
    async (page) => {
      // A tab that is not selected. It has no tooltip.
      await hover(page, await buttonByText(page, "ABI"));
    },
    { hover: true, keepMouse: true },
  ],
  [
    "hover-sidebar-link",
    EVENTS,
    async (page) => {
      await hover(page, await buttonByText(page, "Contracts"));
    },
    { hover: true, keepMouse: true },
  ],
  [
    "hover-tooltip",
    EVENTS,
    async (page) => {
      await hover(page, await visible(page, '[aria-label="Settings"]', 0));
    },
    { hover: true, keepMouse: true },
  ],
];

// Pages at 390 x 844, first with the sidebar open (the default), then closed.
const PHONE_PAGES = [
  ["home", "/"],
  ["contracts", "/eth/Augur-version1/contracts/"],
  ["events", EVENTS],
  ["function", FUNCTION],
];

// Pages with event logs in IndexedDB (see seed()), as if a sync had run.
const DATA_PAGES = [
  ["version", VERSION],
  ["contracts", "/eth/Augur-version1/contracts/"],
  ["contract", CONTRACT],
  ["events", EVENTS],
  ["event", EVENT],
  ["event-logs-text", `${EVENT}#event-logs-text`, "Event Logs (text)"],
  ["event-logs-hex", `${EVENT}#event-logs-hex`, "Event Logs (hex)"],
];

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

// Serves the build like GitHub Pages.
const server = http.createServer((req, res) => {
  let file = path.join(buildDir, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

const NO_MOTION_CSS = `*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
}`;

async function settle(page, { keepMouse = false } = {}) {
  await page.waitForNetworkIdle({ idleTime: 500 });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="loadingSpinner-test"]'),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: NO_MOTION_CSS });
  // Keep the mouse off the buttons, so that no tooltip is shown.
  if (!keepMouse) await page.mouse.move(0, page.viewport().height - 1);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 300))),
  );
}

async function open(page, url, viewport = VIEWPORT) {
  await page.setViewport(viewport);
  await page.goto(`${ORIGIN}${url}`, { waitUntil: "load" });
  await settle(page);
}

// Clicks the visible button that has the tooltip `text`.
// The same buttons are also in the "three dots" menu, which is hidden.
async function clickByTooltip(page, text) {
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

// A BaseButton with href is a link.
async function buttonByText(page, text) {
  const button = await page.evaluateHandle(
    (text) =>
      [...document.querySelectorAll("button, a")].find(
        (e) => e.innerText.trim() === text && e.getClientRects().length > 0,
      ),
    text,
  );
  if (!button.asElement()) throw new Error(`No visible button "${text}"`);
  return button;
}

async function clickByText(page, text) {
  await (await buttonByText(page, text)).click();
}

// The arrow next to a sidebar item opens its accordion. The item is a link.
async function accordionArrow(page, text) {
  const item = await buttonByText(page, text);
  return item.evaluateHandle((item) => {
    for (let e = item; e; e = e.parentElement) {
      const arrow = e.querySelector(':scope > [role="button"]');
      if (arrow) return arrow;
    }
    throw new Error("No accordion arrow");
  });
}

async function hover(page, element) {
  const box = await element.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

// The `index`-th visible element that matches `selector`.
async function visible(page, selector, index) {
  const element = await page.evaluateHandle(
    (selector, index) =>
      [...document.querySelectorAll(selector)].filter(
        (e) => e.getClientRects().length > 0,
      )[index],
    selector,
    index,
  );
  if (!element.asElement()) throw new Error(`No ${selector} [${index}]`);
  return element;
}

// Waits until the tab `value` is selected, so that a URL whose tab is not
// found does not give a screenshot of the first tab.
async function expectTab(page, value) {
  await page.waitForFunction(
    (value) =>
      document.querySelector('input[type="radio"]:checked')?.value === value,
    { timeout: 5000 },
    value,
  );
}

// Opens the "three dots" menu that holds the button `itemText`.
async function openThreeDots(page, itemText) {
  const clicked = await page.evaluate((itemText) => {
    const buttons = [...document.querySelectorAll("button")].filter(
      (b) => b.querySelector("svg#dotsVertical") && b.getClientRects().length,
    );
    const button = buttons.find((b) =>
      [...b.closest(".relative").querySelectorAll("button")].some(
        (e) => e.innerText.trim() === itemText,
      ),
    );
    button?.click();
    return Boolean(button);
  }, itemText);
  if (!clicked) throw new Error(`No "three dots" menu with "${itemText}"`);
}

// Types `text` into the first number input of the settings dialog.
async function typeSetting(page, text) {
  await clickByTooltip(page, "Settings");
  await settle(page);
  await page.focus('dialog[open] input[type="number"]');
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.type(text);
  await page.keyboard.press("Tab");
}

async function setTheme(page, theme) {
  const isDark = () =>
    page.evaluate(() => document.documentElement.classList.contains("dark"));
  if ((await isDark()) !== (theme === "dark")) {
    await clickByTooltip(page, "Change theme");
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      {},
      theme === "dark",
    );
  }
}

// BigInt cannot be passed to the page, so it goes as a string.
const plain = (v) => {
  if (typeof v === "bigint") return { bigint: v.toString() };
  if (Array.isArray(v)) return [...v].map(plain);
  return v;
};

// Event logs made from the ABI of Augur, with fixed values, so that every run
// shows the same rows. The fields are the ones the sync saves.
function fakeLogs(contract, eventName, count) {
  const abi = new Interface(contract.abi);
  const event = abi.getEvent(eventName);
  const startBlock = contract.creation.blockNumber + 10;
  const logs = [];
  for (let i = 0; i < count; i++) {
    const hex = (key, bytes) =>
      "0x" + keccak256Text(`${eventName}-${i}-${key}`).slice(2, 2 + bytes * 2);
    const value = (type, name, j) => {
      if (type.endsWith("[]")) {
        return [0, 1].map((k) => value(type.slice(0, -2), name, `${j}_${k}`));
      }
      if (type === "address") return hex(`a${j}`, 20);
      if (type === "string") return `Fake ${name} #${i}`;
      if (type.startsWith("bytes")) {
        return hex(`b${j}`, Number(type.slice(5)) || 32);
      }
      if (type === "bool") return i % 2 === 0;
      if (type === "uint8") return BigInt(i % 3);
      if (type.startsWith("uint")) return BigInt(i) * 10n ** 18n + 1234n;
      if (type.startsWith("int")) return BigInt(i % 2 ? -1 : 1) * 10n ** 18n;
      throw new Error(`No fake value for ${type}`);
    };
    const values = event.inputs.map((p, j) => value(p.type, p.name, j));
    const { data, topics } = abi.encodeEventLog(event, values);
    const parsed = abi.parseLog({ data, topics });
    logs.push({
      eventName: parsed.name,
      eventSignature: parsed.signature,
      // BigInt cannot be passed to the page, so it goes as a string.
      args: plain(parsed.args),
      blockNumber: startBlock + i * 1000,
      timestampMs: (1531036621 + i * 15000) * 1000,
      blockHash: hex("bh", 32),
      data,
      logIndex: i % 5,
      removed: false,
      topics,
      address: contract.address,
      transactionHash: hex("tx", 32),
      transactionIndex: i % 7,
    });
  }
  return { logs, fetchedBlockNumber: startBlock + 40000 };
}

// The ABI and Dexie come from this working tree, also for the base build.
const augur = JSON.parse(
  fs.readFileSync(
    "src/constants/chains/ethereum-mainnet/augur/version1/Augur.json",
    "utf8",
  ),
);
const marketCreated = fakeLogs(augur, "MarketCreated", 30);
const SEED = {
  tables: {
    Augur_MarketCreated: marketCreated.logs,
    Augur_UniverseCreated: fakeLogs(augur, "UniverseCreated", 3).logs,
  },
  fetchedBlockNumber: marketCreated.fetchedBlockNumber,
  latestBlockNumber: marketCreated.fetchedBlockNumber + 20000,
};
const DEXIE = fs.readFileSync("node_modules/dexie/dist/dexie.min.js", "utf8");

// Writes SEED into the IndexedDB of the app, which the version page creates.
async function seed(page, log) {
  await open(page, VERSION);
  // Not addScriptTag: the Content Security Policy of the app blocks an inline
  // script, but not an evaluate.
  await page.evaluate(DEXIE);
  const counts = await page.evaluate(async (seed) => {
    const revive = (v) => {
      if (Array.isArray(v)) return v.map(revive);
      if (v && typeof v === "object" && "bigint" in v) return BigInt(v.bigint);
      return v;
    };
    const counts = [];
    const eventLogs = new window.Dexie("Digu_EventLog_eth_Augur_version1");
    await eventLogs.open();
    for (const [table, logs] of Object.entries(seed.tables)) {
      await eventLogs.table(table).bulkAdd(
        logs.map(({ timestampMs, ...log }) => ({
          ...log,
          args: revive(log.args),
          jsDate: new Date(timestampMs),
        })),
      );
      counts.push(await eventLogs.table(table).count());
    }
    counts.push(
      await eventLogs.table("SyncStatus").update("Augur", {
        fetchedBlockNumber: seed.fetchedBlockNumber,
        syncStateText: "stopped",
      }),
    );
    eventLogs.close();
    const chainStatus = new window.Dexie("Digu_ChainStatus");
    await chainStatus.open();
    counts.push(
      await chainStatus
        .table("ChainStatus")
        .update("eth", { latestBlockNumber: seed.latestBlockNumber }),
    );
    chainStatus.close();
    return counts;
  }, SEED);
  log.push(`seed: ${counts.join(" ")}`);
  if (counts.join(" ") !== "30 3 1 1") throw new Error("The seed failed");
}

await new Promise((resolve) => server.listen(PORT, resolve));
// Flags that make the drawing the same from run to run.
const LAUNCH_ARGS = [
  "--disable-gpu",
  "--force-color-profile=srgb",
  "--disable-partial-raster",
  "--disable-skia-runtime-opts",
  "--disable-lcd-text",
  "--font-render-hinting=none",
  "--disable-threaded-animation",
  "--disable-threaded-scrolling",
  "--disable-checker-imaging",
];
// A browser, and a browser that answers `(hover: hover)` and
// `(pointer: fine)` like one with a mouse, for MORE_STATES with `hover`.
async function launchBrowsers() {
  return {
    browser: await puppeteer.launch({ args: LAUNCH_ARGS }),
    hoverBrowser: await puppeteer.launch({
      args: [
        ...LAUNCH_ARGS,
        "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4",
      ],
    }),
  };
}

// A page in a fresh browser profile of `browsers`. Its messages go to `log`.
async function newPage(browsers, log, { hover = false } = {}) {
  const { browser, hoverBrowser } = browsers;
  const context = await (hover ? hoverBrowser : browser).createBrowserContext();
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warn") {
      log.push(`[${m.type()}] ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  // Content Security Policy violations. On window, because a blocked fetch or
  // WebSocket has no element to fire at.
  await page.exposeFunction("__logCspViolation", (text) =>
    log.push(`[csp] ${text}`),
  );
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      window.__logCspViolation(
        `${e.effectiveDirective} ${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
  page.on("response", (res) => {
    if (res.status() === 404) {
      const url = new URL(res.url());
      log.push(`[404] ${url.pathname}${url.search}`);
    }
  });
  // No request leaves the container (for example, to an RPC).
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith("http") && url.origin !== ORIGIN) {
      log.push(`[blocked] ${req.url()}`);
      req.abort();
    } else {
      req.continue();
    }
  });
  return { page, close: () => context.close() };
}

async function shoot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
}

// The screens in units that run in parallel. A unit is the screens that share
// a page (the theme, the sidebar or the seed stays in its IndexedDB), or one
// screen after an action. `run` gets `newPage(options)` and its own `log`.
const units = [];
for (const theme of ["light", "dark"]) {
  units.push({
    screens: PAGES.length,
    async run(newPage, log) {
      // The theme is kept in IndexedDB, so it stays across the pages.
      const { page, close } = await newPage();
      await open(page, "/");
      await setTheme(page, theme);
      for (const [name, url] of PAGES) {
        log.push(`${theme}-${name} ${url}`);
        await open(page, url);
        await shoot(page, `${theme}-${name}`);
      }
      await close();
    },
  });
  for (const [name, url, action, options] of [...STATES, ...MORE_STATES]) {
    units.push({
      screens: 1,
      async run(newPage, log) {
        log.push(`${theme}-${name} ${url}`);
        const { page, close } = await newPage(options);
        await open(page, url);
        await setTheme(page, theme);
        await settle(page);
        await action(page);
        await settle(page, options);
        await shoot(page, `${theme}-${name}`);
        await close();
      },
    });
  }
  units.push({
    screens: PHONE_PAGES.length * 2,
    async run(newPage, log) {
      const { page, close } = await newPage();
      await open(page, "/");
      await setTheme(page, theme);
      for (const state of ["sidebar-open", "sidebar-closed"]) {
        if (state === "sidebar-closed") {
          // The choice is kept in IndexedDB.
          await page.click('button[aria-label="Close sidebar"]');
          await settle(page);
        }
        for (const [name, url] of PHONE_PAGES) {
          log.push(`${theme}-phone-${state}-${name} ${url}`);
          await open(page, url, PHONE_VIEWPORT);
          await shoot(page, `${theme}-phone-${state}-${name}`);
        }
      }
      await close();
    },
  });
  units.push({
    screens: DATA_PAGES.length,
    async run(newPage, log) {
      const { page, close } = await newPage();
      await seed(page, log);
      await setTheme(page, theme);
      for (const [name, url, tab] of DATA_PAGES) {
        log.push(`${theme}-data-${name} ${url}`);
        await open(page, url);
        if (tab) await expectTab(page, tab);
        await shoot(page, `${theme}-data-${name}`);
      }
      await close();
    },
  });
}

// Each worker has its own browsers, with one page open at a time.
// With many more Chromes at once, some screenshots were blank or timed out.
const WORKERS = 4;
const logs = units.map(() => []);
// The larger units first, so that the workers end at about the same time.
const queue = [...units.keys()].sort(
  (a, b) => units[b].screens - units[a].screens,
);
const workers = [];
try {
  for (let i = 0; i < WORKERS; i++) workers.push(await launchBrowsers());
  const results = await Promise.allSettled(
    workers.map(async (browsers) => {
      while (queue.length > 0) {
        const i = queue.shift();
        const log = logs[i];
        try {
          await units[i].run((options) => newPage(browsers, log, options), log);
        } catch (e) {
          // Stop the other workers after their current unit.
          queue.length = 0;
          throw e;
        }
      }
    }),
  );
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason;
} finally {
  // In the order of the screens, whichever worker took them.
  fs.writeFileSync(path.join(outDir, "log.txt"), logs.flat().join("\n") + "\n");
  for (const { browser, hoverBrowser } of workers) {
    await browser.close();
    await hoverBrowser.close();
  }
  server.close();
}
