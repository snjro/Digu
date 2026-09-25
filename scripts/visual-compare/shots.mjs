// Takes screenshots of a built app (`npm run build`) with the Chrome of puppeteer.
// Usage (in the test service): node shots.mjs <buildDir> <outDir>
// See README.md in this folder.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

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
const log = [];
const server = http.createServer((req, res) => {
  let file = path.join(buildDir, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }
  if (!fs.existsSync(file)) {
    log.push(`[404] ${req.url}`);
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
  if (!keepMouse) await page.mouse.move(0, VIEWPORT.height - 1);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 300))),
  );
}

async function open(page, url) {
  await page.setViewport(VIEWPORT);
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

await new Promise((resolve) => server.listen(PORT, resolve));
// Flags that make the drawing the same from run to run.
const browser = await puppeteer.launch({
  args: [
    "--disable-gpu",
    "--force-color-profile=srgb",
    "--disable-partial-raster",
    "--disable-skia-runtime-opts",
    "--disable-lcd-text",
    "--font-render-hinting=none",
    "--disable-threaded-animation",
    "--disable-threaded-scrolling",
    "--disable-checker-imaging",
  ],
});

// A page in a fresh browser profile.
async function newPage() {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warn") {
      log.push(`[${m.type()}] ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
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

try {
  for (const theme of ["light", "dark"]) {
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
    for (const [name, url, action, options] of STATES) {
      log.push(`${theme}-${name} ${url}`);
      const { page, close } = await newPage();
      await open(page, url);
      await setTheme(page, theme);
      await settle(page);
      await action(page);
      await settle(page, options);
      await shoot(page, `${theme}-${name}`);
      await close();
    }
  }
} finally {
  fs.writeFileSync(path.join(outDir, "log.txt"), log.join("\n") + "\n");
  await browser.close();
  server.close();
}
