// Section 4: grids. Also 1-5 "View all Event Logs" with seeded logs.
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";
import { seed } from "./seed.mjs";
await L.startServers();
await L.launch();
const { ctx, page } = await L.newContextPage(1400, 900);
await ctx.overridePermissions(L.ROOT, [
  "clipboard-read",
  "clipboard-write",
  "clipboard-sanitized-write",
]);
const DL = path.join(L.OUT, "downloads");
fs.mkdirSync(DL, { recursive: true });
const cdp = await page.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: DL,
  eventsEnabled: true,
  browserContextId: ctx.id,
});
const downloads = [];
cdp.on("Browser.downloadWillBegin", (e) =>
  downloads.push({ name: e.suggestedFilename, guid: e.guid }),
);

const G = {
  contracts: "/eth/Augur-version2/contracts/",
  events: "/eth/Augur-version2/contracts/Augur/events/",
  functions: "/eth/Augur-version1/contracts/Augur/functions/",
};
const firstCol = {
  contracts: "Contract Name",
  events: "Event Name",
  functions: "Function Name",
};

async function gs() {
  return page.evaluate(() => {
    const byIdx = {};
    for (const r of document.querySelectorAll(".ag-row")) {
      const i = r.getAttribute("row-index");
      byIdx[i] = byIdx[i] ?? [];
      byIdx[i].push(
        ...[...r.querySelectorAll(".ag-cell")].map((c) => c.innerText.trim()),
      );
    }
    const rows = Object.entries(byIdx)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, v]) => v);
    return {
      paging: document
        .querySelector(".ag-paging-row-summary-panel")
        ?.innerText.replace(/\s+/g, " "),
      page:
        document
          .querySelector(".ag-paging-description")
          ?.innerText.replace(/\s+/g, " ") +
        " " +
        (document.querySelector(".ag-paging-description input")?.value ?? ""),
      headers: [...document.querySelectorAll(".ag-header-cell")]
        .filter((h) => h.getClientRects().length)
        .map((h) => h.innerText.trim()),
      overlay: [
        ...document.querySelectorAll(
          ".ag-overlay, .ag-overlay-wrapper, .ag-overlay-loading-wrapper, .ag-overlay-no-rows-wrapper",
        ),
      ]
        .filter((e) => e.getClientRects().length)
        .map((e) => e.innerText.trim())
        .join("|"),
      // The loading overlay is a spinner (BaseSpinner in GridBody.svelte), no text.
      loading: !!document
        .querySelector(".ag-root-wrapper svg[role=status]")
        ?.getClientRects().length,
      rows: rows.slice(0, 4),
      nRows: rows.length,
    };
  });
}
const nums = (s) => s.rows.map((r) => r[0]);
async function open(u) {
  await page.goto(L.ROOT + u, { waitUntil: "load" });
  await L.settle(page, 800);
  await page.waitForSelector(".ag-row", { timeout: 20000 }).catch(() => {});
  await L.settle(page, 300);
}
async function btn(label) {
  await page.click(`main button[aria-label="${label}"]`);
  await L.settle(page, 400);
}
async function headerClick(text) {
  const h = await page.evaluateHandle(
    (text) =>
      [...document.querySelectorAll(".ag-header-cell")]
        .find((h) => h.innerText.trim() === text)
        ?.querySelector(".ag-header-cell-label, .ag-header-cell-text"),
    text,
  );
  await h.asElement().click();
  await L.settle(page, 400);
}
async function columnFilter(text, value) {
  const b = await page.evaluateHandle(
    (text) =>
      [...document.querySelectorAll(".ag-header-cell")]
        .find((h) => h.innerText.trim() === text)
        ?.querySelector(
          ".ag-header-cell-filter-button, .ag-header-cell-menu-button, .ag-floating-filter-button-button",
        ),
    text,
  );
  if (!b.asElement()) throw new Error("no filter button for " + text);
  await b.asElement().click();
  await page.waitForSelector(".ag-filter input, .ag-menu input", {
    timeout: 5000,
  });
  const inp = await page.$(
    ".ag-filter input[type=text], .ag-filter input:not([type]), .ag-menu input[type=text]",
  );
  await inp.type(value);
  await L.sleep(800);
  await page.keyboard.press("Escape");
  await L.settle(page, 400);
}
async function snack() {
  return page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .filter((e) => e.children.length === 0 && e.getClientRects().length)
      .map((e) => e.textContent.trim())
      .filter((t) => /^(Copied|Copy failed)/.test(t)),
  );
}

// ---- 4-1..4-5 on each grid ----
const unfilteredPaging = {};
for (const g of ["contracts", "events", "functions"]) {
  await L.step(`4-1-${g}`, page, async () => {
    await open(G[g]);
    const s0 = await gs();
    unfilteredPaging[g] = s0.paging;
    await headerClick(firstCol[g]);
    const s1 = await gs();
    await headerClick(firstCol[g]);
    const s2 = await gs();
    const sh1 = await L.shot(page, `4-1-${g}-sorted-desc`);
    await headerClick(firstCol[g]); // back to none
    let s3, fErr;
    try {
      await columnFilter(
        firstCol[g],
        g === "functions" ? "get" : g === "events" ? "Market" : "Order",
      );
      s3 = await gs();
    } catch (e) {
      fErr = String(e.message);
    }
    const sh2 = await L.shot(page, `4-1-${g}-filtered`);
    const renum = (s) => s && s.rows.every((r, i) => r[0] === String(i + 1));
    const ok =
      s2.rows[0][1] !== s0.rows[0][1] &&
      renum(s1) &&
      renum(s2) &&
      s3 &&
      renum(s3) &&
      s3.paging !== s0.paging;
    L.rec(
      `4-1-${g}`,
      ok ? "OK" : "NG",
      JSON.stringify({
        initial: [s0.paging, s0.rows.map((r) => r.slice(0, 2))],
        asc: s1.rows.map((r) => r.slice(0, 2)),
        desc: s2.rows.map((r) => r.slice(0, 2)),
        filtered: s3 && [s3.paging, s3.rows.map((r) => r.slice(0, 2))],
        fErr,
      }),
      [sh1, sh2],
    );
    // keep the column filter for 4-2
  });
  await L.step(`4-2-${g}`, page, async () => {
    const q = L.QUICK_SEARCH;
    const s0 = await gs();
    await page.type(q, g === "functions" ? "Universe" : "Cancel");
    await L.settle(page, 500);
    const s1 = await gs();
    const sh = await L.shot(page, `4-2-${g}-quick`);
    await btn("clear");
    const v1 = await page.$eval(q, (i) => i.value);
    const s2 = await gs();
    await page.type(q, "Cancel");
    await L.settle(page, 500);
    await btn("Reset all filters");
    const v2 = await page.$eval(q, (i) => i.value);
    const s3 = await gs();
    // #439: Reset all filters also clears the column filter kept from 4-1.
    const ok =
      s1.paging !== s0.paging &&
      v1 === "" &&
      s2.paging === s0.paging &&
      v2 === "" &&
      s3.paging === unfilteredPaging[g];
    L.rec(
      `4-2-${g}`,
      ok ? "OK" : "NG",
      JSON.stringify({
        unfiltered: unfilteredPaging[g],
        withColFilter: s0.paging,
        quick: [s1.paging, s1.rows.map((r) => r[1])],
        afterClear: [v1, s2.paging],
        afterReset: [v2, s3.paging, "#439: the column filter is cleared too"],
      }),
      [sh],
    );
  });
  await L.step(`4-4-${g}`, page, async () => {
    await headerClick(firstCol[g]);
    await headerClick(firstCol[g]);
    const s0 = await gs();
    await page.click(`main button[aria-label="Reload"]`);
    let mid = await gs();
    // Reload shows the spinner for 500 ms (BaseGridFunctionBar.svelte).
    for (let i = 0; i < 20 && !mid.loading; i++) {
      await L.sleep(40);
      mid = await gs();
    }
    const sh = await L.shot(page, `4-4-${g}-reloading`);
    await L.settle(page, 1200);
    const s1 = await gs();
    // the initial order: open fresh
    const ok =
      mid.loading && (s0.rows.length < 2 || s1.rows[0][1] !== s0.rows[0][1]);
    L.rec(
      `4-4-${g}`,
      ok ? "OK" : "NG",
      JSON.stringify({
        beforeReload: [s0.paging, s0.rows.map((r) => r[1])],
        during: { loading: mid.loading, overlay: mid.overlay },
        after: [s1.paging, s1.rows.map((r) => r[1])],
      }),
      [sh],
    );
  });
  await L.step(`4-3-${g}`, page, async () => {
    const h0 = (await gs()).headers;
    await btn("Show all columns");
    const h1 = (await gs()).headers;
    const sh1 = await L.shot(page, `4-3-${g}-all-columns`);
    await btn("Hide minor columns");
    const h2 = (await gs()).headers;
    const width = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".ag-header-cell")]
          .filter((h) => h.getClientRects().length)
          .map((h) => Math.round(h.getBoundingClientRect().width)),
      );
    const w0 = await width();
    await btn("Fit columns in frame");
    const w1 = await width();
    const vp = await page.evaluate(() =>
      Math.round(
        document.querySelector(".ag-root-wrapper")?.getBoundingClientRect()
          .width,
      ),
    );
    await btn("Auto fit columns");
    const w2 = await width();
    const sh2 = await L.shot(page, `4-3-${g}-autofit`);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    // Column groups are open at first (GridBody.svelte) unless they set
    // openByDefault: false, and "Hide minor columns" closes all of them. So
    // the columns after it are the first columns, less those of the groups
    // that were open, in the same order.
    const isSubList = (sub, list) => {
      let i = 0;
      for (const h of list) if (h === sub[i]) i++;
      return i === sub.length;
    };
    const ok =
      h1.length > h0.length &&
      h2.length > 0 &&
      h2.length <= h0.length &&
      isSubList(h2, h0) &&
      JSON.stringify(w1) !== JSON.stringify(w0) &&
      Math.abs(sum(w1) - vp) < 30 &&
      JSON.stringify(w2) !== JSON.stringify(w1);
    L.rec(
      `4-3-${g}`,
      ok ? "OK" : "NG",
      JSON.stringify({
        cols: [h0.length, h1.length, h2.length],
        initial: h0,
        afterHide: h2,
        added: h1.filter((h) => !h0.includes(h)),
        hiddenOpenAtFirst: h0.filter((h) => !h2.includes(h)),
        widthSum: {
          before: sum(w0),
          fit: sum(w1),
          viewport: vp,
          auto: sum(w2),
        },
      }),
      [sh1, sh2],
    );
  });
  await L.step(`4-5-${g}`, page, async () => {
    const vis = () =>
      page.evaluate(
        (SB) => ({
          tabsOrTitle: !!document
            .querySelector("nav[aria-label=Breadcrumb]")
            ?.getClientRects().length,
          sidebar: !!document.querySelector(SB)?.getClientRects().length,
          grid: Math.round(
            document.querySelector(".ag-root-wrapper")?.getBoundingClientRect()
              .height ?? 0,
          ),
        }),
        L.SIDEBAR,
      );
    const v0 = await vis();
    await btn("Full screen");
    const v1 = await vis();
    const exitBtn = await page.$(
      'main button[aria-label="Exit"], button[aria-label="Exit"]',
    );
    const sh = await L.shot(page, `4-5-${g}-fullscreen`);
    await page.keyboard.press("Escape");
    await L.settle(page);
    const v2 = await vis();
    const ok =
      v1.grid > v0.grid &&
      !!exitBtn &&
      JSON.stringify(v2) === JSON.stringify(v0);
    L.rec(
      `4-5-${g}`,
      ok ? "OK" : "NG",
      JSON.stringify({
        before: v0,
        full: v1,
        exitButton: !!exitBtn,
        afterEsc: v2,
      }),
      [sh],
    );
  });
}

// ---- #521, #488: in full screen, Escape closes only the top one ----
await L.step("4-5-escape", page, async () => {
  await open(G.contracts);
  const isFull = async () => !!(await page.$('button[aria-label="Exit"]'));
  const popupOpen = async () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".ag-popup .ag-menu, .ag-popup .ag-filter",
        ),
      ].some((e) => e.getClientRects().length > 0),
    );
  const dialogOpen = async () => !!(await page.$("dialog[open]"));
  const out = {};
  // the column filter popup
  await btn("Full screen");
  out.full = await isFull();
  const fb = await page.evaluateHandle(() =>
    [...document.querySelectorAll(".ag-header-cell")]
      .find((h) => h.innerText.trim() === "Contract Name")
      ?.querySelector(
        ".ag-header-cell-filter-button, .ag-header-cell-menu-button, .ag-floating-filter-button-button",
      ),
  );
  if (!fb.asElement()) throw new Error("no filter button for Contract Name");
  await fb.asElement().click();
  await page.waitForSelector(".ag-popup input", { timeout: 5000 });
  // ag-grid closes its popup only when the focus is inside it (#521).
  await page.click(".ag-popup input");
  out.popupBefore = await popupOpen();
  const sh1 = await L.shot(page, "4-5-escape-popup");
  await page.keyboard.press("Escape");
  await L.settle(page, 300);
  out.afterEsc1 = { popup: await popupOpen(), full: await isFull() };
  await page.keyboard.press("Escape");
  await L.settle(page, 300);
  out.afterEsc2 = { full: await isFull() };
  // the CSV dialog
  await btn("Full screen");
  await btn("Export as CSV");
  await page.waitForSelector("dialog[open]", { timeout: 5000 });
  out.dialogBefore = await dialogOpen();
  const sh2 = await L.shot(page, "4-5-escape-csv-dialog");
  await page.keyboard.press("Escape");
  await L.settle(page, 300);
  out.afterEsc3 = { dialog: await dialogOpen(), full: await isFull() };
  await page.keyboard.press("Escape");
  await L.settle(page, 300);
  out.afterEsc4 = { full: await isFull() };
  const ok =
    out.full &&
    out.popupBefore &&
    !out.afterEsc1.popup &&
    out.afterEsc1.full &&
    !out.afterEsc2.full &&
    out.dialogBefore &&
    !out.afterEsc3.dialog &&
    out.afterEsc3.full &&
    !out.afterEsc4.full;
  L.rec("4-5-escape", ok ? "OK" : "NG", JSON.stringify(out), [sh1, sh2]);
});

// ---- 4-6 paging on contracts v2 (34 rows) ----
await L.step("4-6", page, async () => {
  await open(G.contracts);
  const check = () =>
    page.evaluate(() => {
      const bad = [];
      const byIdx = {};
      for (const r of document.querySelectorAll(".ag-row")) {
        const i = r.getAttribute("row-index");
        (byIdx[i] = byIdx[i] ?? []).push(r);
      }
      let n = 0;
      for (const [i, parts] of Object.entries(byIdx)) {
        n++;
        const cells = parts.flatMap((p) => [...p.querySelectorAll(".ag-cell")]);
        const nameA = cells
          .map((c) => c.querySelector("a[href*='/contracts/']"))
          .find(Boolean);
        const name = nameA?.innerText.trim();
        if (!nameA?.getAttribute("href").includes(`/contracts/${name}`))
          bad.push([i, "link", name, nameA?.getAttribute("href")]);
        const cb = parts.flatMap((p) => [
          ...p.querySelectorAll("input[aria-label^='Sync target']"),
        ]);
        if (cb.length > 1) bad.push([i, "checkboxes", cb.length]);
        if (
          cb[0] &&
          cb[0].getAttribute("aria-label") !== `Sync target: ${name}`
        )
          bad.push([i, "checkbox", cb[0].getAttribute("aria-label")]);
        const copies = parts.flatMap((p) => [
          ...p.querySelectorAll("button[aria-label=Copy]"),
        ]).length;
        if (copies !== 1) bad.push([i, "copy", copies]);
        const ev = cells
          .map((c) => c.querySelector("a[href$='/events']"))
          .find(Boolean);
        if (ev && !ev.getAttribute("href").includes(`/${name}/events`))
          bad.push([i, "eventsLink", ev.getAttribute("href")]);
      }
      return {
        n,
        bad,
        first: document.querySelector(".ag-row[row-index] .ag-cell")?.innerText,
      };
    });
  const out = [await check()];
  const shots = [];
  for (const b of [
    "Next Page",
    "Previous Page",
    "Next Page",
    "Previous Page",
    "Last Page",
    "First Page",
  ]) {
    await page.click(`.ag-paging-button[aria-label="${b}"]`);
    await L.settle(page, 300);
    const c = await check();
    c.after = b;
    c.paging = (await gs()).paging;
    c.nums = nums(await gs());
    out.push(c);
  }
  await page.click(`.ag-paging-button[aria-label="Next Page"]`);
  await L.settle(page, 300);
  shots.push(await L.shot(page, "4-6-page2"));
  const ok = out.every((c) => c.bad.length === 0);
  L.rec("4-6", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

// ---- 4-8 Copy in the grid ----
await L.step("4-8", page, async () => {
  await open(G.contracts);
  await page.evaluate(() => navigator.clipboard.writeText("-"));
  const b = await page.$(".ag-row button[aria-label=Copy]");
  await b.click();
  await L.sleep(150);
  const sn = await snack();
  const sh = await L.shot(page, "4-8-copied");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  // without permission (new context)
  const { ctx: c2, page: p2 } = await L.newContextPage(1400, 900, "noperm");
  await p2.goto(L.ROOT + G.contracts, { waitUntil: "load" });
  await L.settle(p2, 800);
  await p2.waitForSelector(".ag-row button[aria-label=Copy]");
  // deny explicitly
  await c2.overridePermissions(L.ROOT, []);
  await (await p2.$(".ag-row button[aria-label=Copy]")).click();
  await L.sleep(150);
  const sn2 = await p2.evaluate(() =>
    [...document.querySelectorAll("*")]
      .filter((e) => e.children.length === 0 && e.getClientRects().length)
      .map((e) => e.textContent.trim())
      .filter((t) => /^(Copied|Copy failed)/.test(t)),
  );
  const sh2 = await L.shot(p2, "4-8-no-permission");
  await c2.close();
  L.rec(
    "4-8",
    sn.includes("Copied") && sn2.includes("Copy failed") ? "OK" : "NG",
    JSON.stringify({
      granted: { snackbar: sn, clipboard: clip },
      denied: { snackbar: sn2 },
    }),
    [sh, sh2],
  );
});

// ---- 4-7 CSV dialog ----
async function radio(title, labelText) {
  const h = await page.evaluateHandle(
    (title, labelText) => {
      const d = document.querySelector("dialog[open]");
      const t = [...d.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && e.textContent.trim() === title,
      );
      for (let e = t; e && e !== d; e = e.parentElement) {
        const inp = e.querySelector(
          `input[type=radio][aria-label='${labelText}']`,
        );
        if (inp) {
          const box = inp.parentElement;
          return (
            [...box.querySelectorAll("label,button,a,span")].find(
              (x) =>
                x.innerText?.trim() === labelText && x.getClientRects().length,
            ) ?? null
          );
        }
      }
      return null;
    },
    title,
    labelText,
  );
  if (!h.asElement()) throw new Error(`radio ${title}/${labelText} not found`);
  await h.asElement().click();
  await L.sleep(150);
}
async function exportCsv(tag) {
  const before = downloads.length;
  await L.click(page, "Export", { scope: "dialog[open]" });
  for (let i = 0; i < 50 && downloads.length === before; i++)
    await L.sleep(100);
  await L.sleep(800);
  const d = downloads[downloads.length - 1];
  if (!d || downloads.length === before) return { tag, error: "no download" };
  const files = fs.readdirSync(DL);
  const f =
    files.find((x) => x === d.name) ??
    files.find((x) => x.includes(d.guid)) ??
    d.guid;
  let content;
  try {
    content = fs.readFileSync(`${DL}/${f}`, "utf8");
  } catch (e) {
    content = "read error " + e.message + " files=" + files.join(",");
  }
  const keep = `${DL}/${tag}.csv`;
  try {
    fs.renameSync(`${DL}/${f}`, keep);
  } catch {
    // keep the original name
  }
  return {
    tag,
    suggested: d.name,
    onDisk: f,
    lines: content.split("\n").length,
    head: content
      .split("\n")
      .slice(0, 3)
      .map((l) => l.slice(0, 200)),
  };
}
await L.step("4-7", page, async () => {
  await open(G.contracts);
  const out = [];
  const shots = [];
  await btn("Export as CSV");
  await page.waitForSelector("dialog[open]");
  shots.push(await L.shot(page, "4-7-dialog"));
  out.push(await exportCsv("defaults"));
  await radio("Row number", "No");
  await radio("Column separator", "Tab");
  await radio("Double quotes", "No");
  await radio("Column headers", "No");
  out.push(await exportCsv("noRow-tab-noQuote-noHeader"));
  await radio("Column separator", 'Bar "|"');
  await radio("Column headers", "Yes");
  await page.evaluate(() => navigator.clipboard.writeText("-"));
  await L.click(page, "Copy", { scope: "dialog[open]" });
  await L.sleep(300);
  const sn = await snack();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  shots.push(await L.shot(page, "4-7-copy"));
  out.push({
    tag: "copy bar+headers",
    snackbar: sn,
    clipLines: clip.split("\n").length,
    head: clip
      .split("\n")
      .slice(0, 2)
      .map((l) => l.slice(0, 160)),
  });
  await page.keyboard.press("Escape");
  await L.settle(page);
  // filtered & sorted
  await page.type(L.QUICK_SEARCH, "Order");
  await L.settle(page, 400);
  await headerClick("Contract Name");
  await headerClick("Contract Name");
  const s = await gs();
  await btn("Export as CSV");
  await page.waitForSelector("dialog[open]");
  const kept = await page.evaluate(() =>
    [
      ...document.querySelectorAll("dialog[open] input[type=radio]:checked"),
    ].map((i) => i.value),
  );
  await radio("Filtered & Sorted", "Filtered & Sorted");
  out.push({
    grid: s.paging,
    keptOptions: kept,
    ...(await exportCsv("filtered")),
  });
  await radio("Filtered & Sorted", "All");
  out.push(await exportCsv("all-after-filter"));
  await page.keyboard.press("Escape");
  L.rec("4-7", "CHECK", JSON.stringify(out), shots);
});

// ---- event logs: seed and check ----
await L.step("4-logs", page, async () => {
  await open("/eth/Augur-version1/");
  const rep = await seed(page, 60);
  await page.goto(
    L.ROOT + "/eth/Augur-version1/contracts/Augur/events/MarketCreated/",
    { waitUntil: "load" },
  );
  await L.settle(page, 1000);
  const ov = await page.evaluate(
    () =>
      document
        .querySelector("main")
        ?.innerText.replace(/\s+/g, " ")
        .match(/Fetched Event Logs.{0,300}/)?.[0],
  );
  const sh0 = await L.shot(page, "1-5-event-overview-with-logs");
  await L.click(page, "View all Event Logs", { scope: "main" });
  await L.settle(page, 1500);
  const u = await page.evaluate(() => location.hash);
  await page.waitForSelector(".ag-row", { timeout: 20000 }).catch(() => {});
  await L.settle(page, 500);
  const s0 = await gs();
  const sh1 = await L.shot(page, "4-logs");
  L.rec(
    "1-5-viewAllLogs",
    u === "#event-logs" ? "OK" : "NG",
    `seed=${JSON.stringify(rep)} overview="${ov?.slice(0, 200)}" → hash ${u}`,
    [sh0],
  );
  await btn("Show all columns");
  const sAll = await gs();
  const sh1b = await L.shot(page, "4-logs-all-columns");
  await headerClick(
    sAll.headers.find((h) => /blockNumber|blocknumber/i.test(h)) ??
      sAll.headers[1],
  );
  await headerClick(
    sAll.headers.find((h) => /blockNumber|blocknumber/i.test(h)) ??
      sAll.headers[1],
  );
  const s1 = await gs();
  await page.click(`.ag-paging-button[aria-label="Next Page"]`);
  await L.settle(page, 300);
  const s2 = await gs();
  const sh2 = await L.shot(page, "4-logs-desc-page2");
  L.rec(
    "4-logs",
    "CHECK",
    JSON.stringify({
      initial: [s0.paging, s0.headers, s0.rows.slice(0, 2)],
      allCols: sAll.headers,
      desc: s1.rows.slice(0, 2),
      page2: [s2.paging, nums(s2)],
    }),
    [sh1, sh1b, sh2],
  );
  await btn("Export as CSV");
  await page.waitForSelector("dialog[open]");
  const ex = await exportCsv("event-logs-defaults");
  await page.keyboard.press("Escape");
  L.rec(
    "4-logs-csv",
    "CHECK",
    JSON.stringify({
      nameStartsWithEventLogs: /^eventLogs-/.test(ex.suggested ?? ""),
      csv: ex,
    }),
  );
  // events grid Num of Logs link
  await open("/eth/Augur-version1/contracts/Augur/events/");
  const nl = await page.$$eval(".ag-row a", (as) =>
    as
      .filter((a) => /#event-logs$/.test(a.getAttribute("href")))
      .map((a) => [a.innerText, a.getAttribute("href")]),
  );
  if (nl[0]) {
    await page.click(`.ag-row a[href="${nl[0][1]}"]`);
    await L.settle(page, 1000);
  }
  L.rec(
    "1-5-numOfLogsLink",
    nl.length && (await page.evaluate(() => location.hash)) === "#event-logs"
      ? "OK"
      : "NG",
    JSON.stringify({
      links: nl,
      url: await page.evaluate(() => location.pathname + location.hash),
    }),
  );
});

L.rec("downloads", "INFO", `${downloads.length} files`, [], { downloads });
await L.finish("sec4");
