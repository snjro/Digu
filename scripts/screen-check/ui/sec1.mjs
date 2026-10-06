// Section 1: start, navigation, URL. Usage: node sec1.mjs [root|digu]
import * as L from "./lib.mjs";
const mode = process.argv[2] ?? "root";
const BASE = mode === "digu" ? L.DIGU : L.ROOT;
const P = mode === "digu" ? "1-10" : "1";
const pre = mode === "digu" ? "d-" : "";
await L.startServers();
await L.launch();
const { page } = await L.newContextPage();
const SB = "aside[aria-label=Sidebar]";
const BC = "nav[aria-label=Breadcrumb]";
const path = () => page.evaluate(() => location.pathname + location.hash);

async function selectedInSidebar() {
  return page.evaluate((SB) => {
    return [...document.querySelectorAll(`${SB} a`)]
      .filter(
        (a) =>
          Number(getComputedStyle(a).fontWeight) >= 700 ||
          a.querySelector("[class*=font-bold]") ||
          a.className.includes("font-bold"),
      )
      .map((a) => a.innerText.trim());
  }, SB);
}
async function sbClick(label) {
  // open the parent accordion if the link is hidden
  try {
    await L.click(page, label, { scope: SB });
    return "visible";
  } catch {
    return "hidden";
  }
}
const sub = (u) => u.replace(/^\/Digu/, "");

// 1-1
await L.step(`${P}-1`, page, async () => {
  const resp = await page.goto(BASE + "/", { waitUntil: "load" });
  await L.settle(page, 800);
  const p = await path();
  const db = await L.idb(page);
  const s = await L.shot(page, `${pre}1-1-top`);
  const us = db.Digu_Settings?.UserSettings;
  const ok = sub(p) === "/eth/";
  L.rec(
    `${P}-1`,
    ok ? "OK" : "NG",
    `status ${resp?.status()} → ${p}; DBs: ${Object.keys(db).join(",")}; UserSettings=${JSON.stringify(us)?.slice(0, 200)}`,
    [s],
  );
});

// 1-2 sidebar tree
await L.step(`${P}-2`, page, async () => {
  const steps = [];
  const want = [
    ["Augur version1", "/eth/Augur-version1/"],
    ["Contracts", "/eth/Augur-version1/contracts/"],
    ["Augur", "/eth/Augur-version1/contracts/Augur/#overview"],
    ["Events", "/eth/Augur-version1/contracts/Augur/events/"],
    [
      "MarketCreated",
      "/eth/Augur-version1/contracts/Augur/events/MarketCreated/#overview",
    ],
  ];
  let ok = true;
  const shots = [];
  let prev = null;
  for (const [label, exp] of want) {
    let vis = await sbClick(label);
    if (vis === "hidden" && prev) {
      // the selected item's own accordion stays closed; open it with the arrow
      await page.click(`${SB} [aria-label="Toggle ${prev}"]`);
      await L.settle(page, 200);
      vis = "hidden→arrow " + (await sbClick(label));
    }
    prev = label;
    await L.settle(page);
    const p = await path();
    const sel = await selectedInSidebar();
    const good = sub(p) === exp && sel.includes(label);
    if (!good) ok = false;
    steps.push({ label, vis, url: p, bold: sel });
    shots.push(await L.shot(page, `${pre}1-2-${label}`));
  }
  L.rec(`${P}-2`, ok ? "OK" : "NG", JSON.stringify(steps), shots);
});

// 1-4 tabs on the event page + reload
await L.step(`${P}-4`, page, async () => {
  const ev = BASE + "/eth/Augur-version1/contracts/Augur/events/MarketCreated/";
  if (!sub(await path()).includes("MarketCreated")) {
    await page.goto(ev, { waitUntil: "load" });
    await L.settle(page);
  }
  const out = [];
  let ok = true;
  const shots = [];
  for (const [tab, hash] of [
    ["ABI", "#abi"],
    ["Event Logs", "#event-logs"],
    ["Overview", "#overview"],
  ]) {
    await L.click(page, tab, { scope: "main" }).catch(() => L.click(page, tab));
    await L.settle(page);
    const h1 = await page.evaluate(() => location.hash);
    const chk1 = await page.evaluate(() =>
      document
        .querySelector("input[type=radio]:checked")
        ?.getAttribute("aria-label"),
    );
    await page.reload({ waitUntil: "load" });
    await L.settle(page, 800);
    const h2 = await page.evaluate(() => location.hash);
    const chk2 = await page.evaluate(() =>
      document
        .querySelector("input[type=radio]:checked")
        ?.getAttribute("aria-label"),
    );
    const good = h1 === hash && h2 === hash && chk1 === tab && chk2 === tab;
    if (!good) ok = false;
    out.push({ tab, afterClick: [h1, chk1], afterReload: [h2, chk2] });
    shots.push(await L.shot(page, `${pre}1-4-${hash.slice(1)}`));
  }
  L.rec(`${P}-4`, ok ? "OK" : "NG", JSON.stringify(out), shots);
});

// 1-3 breadcrumb
await L.step(`${P}-3`, page, async () => {
  const out = [];
  let ok = true;
  const shots = [];
  for (const [label, exp] of [
    ["events", "/eth/Augur-version1/contracts/Augur/events/"],
    ["Augur", "/eth/Augur-version1/contracts/Augur/#overview"],
    ["contracts", "/eth/Augur-version1/contracts/"],
    ["Augur version1", "/eth/Augur-version1/"],
    ["Home", "/eth/"],
  ]) {
    if (label === "events") {
      await page.goto(
        BASE +
          "/eth/Augur-version1/contracts/Augur/events/MarketCreated/#overview",
        { waitUntil: "load" },
      );
      await L.settle(page);
    }
    await L.click(page, label, { scope: BC });
    await L.settle(page);
    const p = await path();
    const bcText = await page.evaluate(
      (BC) => document.querySelector(BC)?.innerText.replace(/\s+/g, " "),
      BC,
    );
    if (sub(p) !== exp) ok = false;
    out.push({ label, url: p, bc: bcText });
    shots.push(await L.shot(page, `${pre}1-3-${label.replace(/ /g, "_")}`));
  }
  L.rec(`${P}-3`, ok ? "OK" : "NG", JSON.stringify(out), shots);
});

// 1-5 "View more details" and links in tables/grids
await L.step(`${P}-5`, page, async () => {
  const out = [];
  let ok = true;
  const shots = [];
  // version page: View more details (Contracts group)
  await page.goto(BASE + "/eth/Augur-version1/", { waitUntil: "load" });
  await L.settle(page);
  await L.click(page, "View more details", { scope: "main" });
  await L.settle(page);
  let p = await path();
  out.push({ from: "version View more details", url: p });
  if (sub(p) !== "/eth/Augur-version1/contracts/") ok = false;
  // contracts grid: link Augur
  await page.waitForSelector(".ag-row", { timeout: 15000 });
  const link = await page.$$eval(
    ".ag-center-cols-container a, .ag-pinned-left-cols-container a",
    (as) =>
      as.map((a) => [a.innerText.trim(), a.getAttribute("href")]).slice(0, 5),
  );
  out.push({ gridLinks: link });
  await L.click(page, "Augur", { scope: ".ag-root" });
  await L.settle(page);
  p = await path();
  out.push({ from: "contracts grid Augur", url: p });
  if (sub(p) !== "/eth/Augur-version1/contracts/Augur/#overview") ok = false;
  shots.push(await L.shot(page, `${pre}1-5-contract`));
  // contract page: View more details in the Events / Functions groups
  const vm = await page.$$eval("main a, main button", (as) =>
    as
      .filter((a) => a.innerText.trim() === "View more details")
      .map((a) => a.getAttribute("href")),
  );
  out.push({ contractViewMore: vm });
  await L.click(page, "View more details", { scope: "main", nth: 0 });
  await L.settle(page);
  p = await path();
  out.push({ from: "contract View more details #0", url: p });
  if (!/\/contracts\/Augur\/(events|functions)\/$/.test(sub(p))) ok = false;
  // events grid: event link
  await page.waitForSelector(".ag-row", { timeout: 15000 });
  await L.click(page, "MarketCreated", { scope: ".ag-root" });
  await L.settle(page);
  p = await path();
  out.push({ from: "events grid MarketCreated", url: p });
  if (
    sub(p) !==
    "/eth/Augur-version1/contracts/Augur/events/MarketCreated/#overview"
  )
    ok = false;
  // contract overview: event link in Events list
  await page.goto(BASE + "/eth/Augur-version1/contracts/Augur/", {
    waitUntil: "load",
  });
  await L.settle(page);
  const evLinks = await page.$$eval("main a", (as) =>
    as
      .filter((a) => /\/events\/[A-Za-z]/.test(a.getAttribute("href") ?? ""))
      .map((a) => a.getAttribute("href"))
      .slice(0, 2),
  );
  const fnLinks = await page.$$eval("main a", (as) =>
    as
      .filter((a) => /\/functions\/[A-Za-z]/.test(a.getAttribute("href") ?? ""))
      .map((a) => a.getAttribute("href"))
      .slice(0, 2),
  );
  out.push({ evLinks, fnLinks });
  if (fnLinks[0]) {
    await page.click(`main a[href="${fnLinks[0]}"]`);
    await L.settle(page);
    p = await path();
    out.push({
      from: "contract overview function link",
      url: p,
      h: (await L.info(page)).h1,
    });
    shots.push(await L.shot(page, `${pre}1-5-function`));
  }
  L.rec(
    `${P}-5`,
    ok ? "OK" : "NG",
    JSON.stringify(out) + " (View all Event Logs needs logs; sec4 checks it)",
    shots,
  );
});

// 1-6 back / forward
await L.step(`${P}-6`, page, async () => {
  const seq = [];
  await page.goto(
    BASE + "/eth/Augur-version1/contracts/Augur/events/MarketCreated/",
    { waitUntil: "load" },
  );
  await L.settle(page);
  await L.click(page, "ABI", { scope: "main" });
  await L.settle(page);
  await L.click(page, "Augur", { scope: BC });
  await L.settle(page);
  seq.push(await path());
  await page.goBack();
  await L.settle(page);
  const b1 = await path();
  const t1 = await page.evaluate(() =>
    document
      .querySelector("input[type=radio]:checked")
      ?.getAttribute("aria-label"),
  );
  await page.goBack();
  await L.settle(page);
  const b2 = await path();
  const t2 = await page.evaluate(() =>
    document
      .querySelector("input[type=radio]:checked")
      ?.getAttribute("aria-label"),
  );
  await page.goForward();
  await L.settle(page);
  const f1 = await path();
  const s = await L.shot(page, `${pre}1-6-forward`);
  const ok =
    /MarketCreated\/#abi$/.test(b1) &&
    t1 === "ABI" &&
    /MarketCreated\/#overview$/.test(b2) &&
    t2 === "Overview" &&
    /MarketCreated\/#abi$/.test(f1);
  L.rec(
    `${P}-6`,
    ok ? "OK" : "NG",
    JSON.stringify({
      start: seq,
      back1: [b1, t1],
      back2: [b2, t2],
      forward: f1,
    }),
    [s],
  );
});

// 1-7 unknown names by in-app navigation
await L.step(`${P}-7`, page, async () => {
  const out = [];
  let ok = true;
  const shots = [];
  const pfx = mode === "digu" ? "/Digu" : "";
  for (const [name, u] of [
    ["chain", "/foo/"],
    ["project", "/eth/NoSuch-version1/"],
    ["contract", "/eth/Augur-version1/contracts/NoSuch/"],
    ["event", "/eth/Augur-version1/contracts/Augur/events/NoSuch/"],
    [
      "selector",
      "/eth/Augur-version1/contracts/Augur/functions/getVersion-0x12345678/",
    ],
  ]) {
    await page.goto(BASE + "/eth/Augur-version1/", { waitUntil: "load" });
    await L.settle(page);
    await page.evaluate((href) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = "x";
      a.id = "injected";
      (document.querySelector("main") ?? document.body).appendChild(a);
      a.click();
    }, pfx + u);
    await L.settle(page, 800);
    const t = await page.evaluate(() =>
      document
        .querySelector("main")
        ?.innerText.replace(/\s+/g, " ")
        .slice(0, 200),
    );
    const bc = await page.evaluate((BC) => {
      const n = document.querySelector(BC);
      return n ? n.getClientRects().length > 0 : false;
    }, BC);
    const home = await page.evaluate(() =>
      [...document.querySelectorAll("main a")]
        .filter((a) => /home/i.test(a.innerText))
        .map((a) => a.getAttribute("href")),
    );
    const db = await L.idb(page);
    const sel = db.Digu_Settings?.UserSettings?.[0]?.selectedChainName;
    // #394: the error page has an h1. #469: HOME stays under /Digu/.
    const h1 = await page.evaluate(() =>
      [...document.querySelectorAll("main h1")].map((e) => e.innerText.trim()),
    );
    const homeOk =
      mode === "digu"
        ? home.length > 0 && home.every((h) => h.startsWith("/Digu/"))
        : home.length > 0;
    const good =
      /404/.test(t ?? "") && !bc && homeOk && h1.length > 0 && sel === "eth";
    if (!good) ok = false;
    out.push({
      name,
      url: await path(),
      text: t,
      h1,
      breadcrumbVisible: bc,
      home,
      selectedChainName: sel,
    });
    shots.push(await L.shot(page, `${pre}1-7-${name}`));
  }
  // HOME button
  await L.click(page, "HOME", { scope: "main", exact: false }).catch(() => {});
  await L.settle(page);
  out.push({ afterHome: await path() });
  L.rec(`${P}-7`, ok ? "OK" : "NG", JSON.stringify(out), shots);
});

// 1-8 open /matic/... directly (fresh context)
await L.step(`${P}-8`, page, async () => {
  const { ctx: c2, page: p2 } = await L.newContextPage();
  await p2.goto(BASE + "/matic/Augur-turbo/contracts/", { waitUntil: "load" });
  await L.settle(p2, 800);
  const sel = await p2.$eval("select[aria-label=Chain]", (s) => s.value);
  const sb = await p2.evaluate(
    (SB) =>
      document.querySelector(SB)?.innerText.replace(/\s+/g, " ").slice(0, 200),
    SB,
  );
  const db = await L.idb(p2);
  const us = db.Digu_Settings?.UserSettings?.[0];
  const s = await L.shot(p2, `${pre}1-8-matic-direct`);
  const ok =
    sel === "matic" && /turbo/.test(sb) && us?.selectedChainName === "matic";
  L.rec(
    `${P}-8`,
    ok ? "OK" : "NG",
    JSON.stringify({
      url: await p2.evaluate(() => location.pathname),
      select: sel,
      sidebar: sb,
      selectedChainName: us?.selectedChainName,
    }),
    [s],
  );
  await c2.close();
});

// 1-9 select matic in the sidebar
await L.step(`${P}-9`, page, async () => {
  await page.goto(BASE + "/eth/Augur-version1/", { waitUntil: "load" });
  await L.settle(page);
  await page.select("select[aria-label=Chain]", "matic");
  await L.settle(page, 800);
  const p = await path();
  const sb = await page.evaluate(
    (SB) =>
      document.querySelector(SB)?.innerText.replace(/\s+/g, " ").slice(0, 150),
    SB,
  );
  const db = await L.idb(page);
  const s = await L.shot(page, `${pre}1-9-select-matic`);
  const ok = sub(p) === "/matic/" && /turbo/.test(sb);
  L.rec(
    `${P}-9`,
    ok ? "OK" : "NG",
    JSON.stringify({
      url: p,
      sidebar: sb,
      selectedChainName: db.Digu_Settings?.UserSettings?.[0]?.selectedChainName,
    }),
    [s],
  );
  // back to eth
  await page.select("select[aria-label=Chain]", "eth");
  await L.settle(page);
});

if (mode === "digu") {
  // link hrefs under /Digu/
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.startsWith("/")),
  );
  const logo = await page.evaluate(() =>
    document.querySelector("aside a")?.getAttribute("href"),
  );
  // #469: the logo goes to /Digu/ (resolved, since the href can be relative).
  const logoPath = await page.evaluate(() => {
    const a = document.querySelector("aside a");
    return a ? new URL(a.href).pathname : null;
  });
  L.rec(
    "1-10-hrefs",
    hrefs.every((h) => h.startsWith("/Digu")) && logoPath === "/Digu/"
      ? "OK"
      : "NG",
    `logo=${logo} (${logoPath}); hrefs sample: ${JSON.stringify(hrefs.slice(0, 8))}; not under /Digu: ${hrefs.filter((h) => !h.startsWith("/Digu")).length}/${hrefs.length}`,
  );
}
await L.finish(`sec1-${mode}`);
