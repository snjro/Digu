// Section 5 (ABI) and 8 (keyboard, quirks).
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";
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
cdp.on("Browser.downloadWillBegin", (e) => downloads.push(e.suggestedFilename));

const CON = L.ROOT + "/eth/Augur-version1/contracts/Augur/#abi";
const abiText = () =>
  page.evaluate(() => {
    const e = [...document.querySelectorAll("main pre, main code")]
      .filter((x) => x.getClientRects().length)
      .sort((a, b) => b.innerText.length - a.innerText.length)[0];
    return e?.innerText ?? null;
  });
const barLabels = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("main button[aria-label]")]
      .filter((b) => b.getClientRects().length)
      .map((b) => b.getAttribute("aria-label")),
  );
async function b(label) {
  await page.click(`main button[aria-label="${label}"]`);
  await L.settle(page, 300);
}

await page.goto(CON, { waitUntil: "load" });
await L.settle(page, 800);

await L.step("5-1", page, async () => {
  const seq = [];
  const shots = [];
  // #399: the JSON color #c92938 (rgb(201, 41, 56)) in the light theme.
  const colors = await page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll("main pre span, main code span")]
        .filter((e) => e.getClientRects().length)
        .map((e) => getComputedStyle(e).color),
    ),
  ]);
  L.rec(
    "5-1-399",
    colors.includes("rgb(201, 41, 56)") ? "OK" : "CHECK",
    `colors in the JSON: ${JSON.stringify(colors)}`,
  );
  for (let i = 0; i < 4; i++) {
    const labels = await barLabels();
    const t = await abiText();
    seq.push({
      fmtButton: labels[0],
      exportButton: labels.find((l) => /^Export/.test(l)),
      head: t?.slice(0, 80).replace(/\s+/g, " "),
      len: t?.length,
    });
    shots.push(await L.shot(page, `5-1-format-${i}`));
    await b(labels[0]);
  }
  const f = seq.map((s) => s.fmtButton);
  const ok =
    f[0] === "JSON" &&
    f[1] === "Human readable (full)" &&
    f[2] === "Human readable (minimal)" &&
    f[3] === "JSON" &&
    seq[0].head?.startsWith("[") &&
    !seq[1].head?.startsWith("[{");
  L.rec("5-1", ok ? "OK" : "NG", JSON.stringify(seq), shots);
});

await L.step("5-2", page, async () => {
  const labels = await barLabels();
  const wrap = labels[1];
  const t0 = await abiText();
  await b(wrap);
  const t1 = await abiText();
  const w1 = (await barLabels())[1];
  const s = await L.shot(page, "5-2-toggled");
  await b(w1);
  const t2 = await abiText();
  const lines = (t) => t?.split("\n").length;
  const ok = lines(t0) !== lines(t1) && lines(t2) === lines(t0);
  L.rec(
    "5-2",
    ok ? "OK" : "NG",
    JSON.stringify({
      label0: wrap,
      lines0: lines(t0),
      label1: w1,
      lines1: lines(t1),
      indent1: t1?.split("\n")[1]?.match(/^ */)?.[0].length,
      lines2: lines(t2),
      head1: t1?.slice(0, 60),
    }),
    [s],
  );
});

await L.step("5-3", page, async () => {
  const out = [];
  await page.goto(CON, { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 800);
  for (let i = 0; i < 2; i++) {
    const labels = await barLabels();
    const exp = labels.find((l) => /^Export/.test(l));
    const shown = await abiText();
    const n = downloads.length;
    await b(exp);
    for (let k = 0; k < 30 && downloads.length === n; k++) await L.sleep(100);
    await L.sleep(600);
    const name = downloads[downloads.length - 1];
    let content;
    try {
      content = fs.readFileSync(`${DL}/${name}`, "utf8");
    } catch (e) {
      content = "ERR " + e.message;
    }
    out.push({
      button: exp,
      file: name,
      sameAsShown: content === shown,
      fileLen: content?.length,
      shownLen: shown?.length,
      fileHead: content?.slice(0, 60),
    });
    // copy
    await page.evaluate(() => navigator.clipboard.writeText("-"));
    await b("Copy to clipboard");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    out[out.length - 1].copySame = clip === shown;
    await b(labels[0]); // next format
  }
  // back to JSON
  await b((await barLabels())[0]);
  const ok =
    out[0].file?.endsWith(".json") &&
    out[0].sameAsShown &&
    out[1].file?.endsWith(".txt") &&
    out[1].sameAsShown;
  L.rec("5-3", ok ? "OK" : "NG", JSON.stringify(out));
  // fragment on event page
  await page.goto(
    L.ROOT + "/eth/Augur-version1/contracts/Augur/events/MarketCreated/#abi",
    { waitUntil: "load" },
  );
  await L.settle(page, 800);
  const n = downloads.length;
  await b((await barLabels()).find((l) => /^Export/.test(l)));
  for (let k = 0; k < 30 && downloads.length === n; k++) await L.sleep(100);
  L.rec(
    "5-3-fragment",
    /^ABIfragment-/.test(downloads[downloads.length - 1] ?? "") ? "OK" : "NG",
    `file=${downloads[downloads.length - 1]}`,
  );
  // full screen on ABI
  await b("Full screen");
  const fs1 = await L.shot(page, "5-abi-fullscreen");
  await page.keyboard.press("Escape");
  await L.settle(page);
  L.rec(
    "5-abi-fullscreen",
    (await barLabels()).includes("Full screen") ? "OK" : "NG",
    "Full screen → Esc",
    [fs1],
  );
});

await L.step("5-4", page, async () => {
  const out = [];
  const shots = [];
  // Components "View" on a tuple function
  await page.goto(
    L.ROOT +
      "/matic/Augur-turbo/contracts/SportsLinkMarketFactory/functions/getMarketDetails-0xb06c1ba3/",
    { waitUntil: "load" },
  );
  await L.settle(page, 800);
  await L.click(page, "View", { scope: "main" });
  await L.settle(page);
  const d1 = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]");
    return d ? d.innerText.replace(/\s+/g, " ").slice(0, 120) : null;
  });
  shots.push(await L.shot(page, "5-4-components"));
  await page.keyboard.press("Escape");
  await L.settle(page);
  const c1 = !(await page.$("dialog[open]"));
  out.push({ components: d1, closedByEsc: c1 });
  // constructor inputs number on the contracts grid
  await page.goto(L.ROOT + "/eth/Augur-version2/contracts/", {
    waitUntil: "load",
  });
  await L.settle(page, 800);
  await page.waitForSelector(".ag-row");
  // The Constructor column group starts closed (#535): open it first.
  await page.evaluate(() => {
    const c = [...document.querySelectorAll(".ag-header-group-cell")].find(
      (e) => /Constructor/.test(e.innerText),
    );
    const ctl =
      c?.querySelector(".ag-header-expand-icon:not(.ag-hidden)") ??
      c?.querySelector("button,[role=button]") ??
      c?.querySelector(".ag-header-group-cell-label");
    ctl?.scrollIntoView({ inline: "center" });
    ctl?.click();
  });
  await L.settle(page);
  const clicked = await page.evaluate(() => {
    const bs = [...document.querySelectorAll(".ag-cell button")].filter(
      (e) => /^\d+$/.test(e.innerText.trim()) && e.innerText.trim() !== "0",
    );
    bs[0]?.click();
    return bs[0]
      ? bs[0].closest(".ag-row").getAttribute("row-index") +
          ":" +
          bs[0].innerText
      : null;
  });
  await L.settle(page);
  const d2 = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]");
    return d ? d.innerText.replace(/\s+/g, " ").slice(0, 160) : null;
  });
  shots.push(await L.shot(page, "5-4-constructor-inputs"));
  await L.click(page, "Close", { scope: "dialog[open]" }).catch(() =>
    page.click("dialog[open] button[aria-label=Close]"),
  );
  await L.settle(page);
  const c2 = !(await page.$("dialog[open]"));
  out.push({ constructorButton: clicked, dialog: d2, closedByX: c2 });
  const ok = d1 && c1 && d2 && c2;
  L.rec("5-4", ok ? "OK" : "NG", JSON.stringify(out), shots);
});

await L.step("8-2", page, async () => {
  await page.goto(L.ROOT + "/eth/Augur-version1/contracts/", {
    waitUntil: "load",
  });
  await L.settle(page, 800);
  await page.click('button[aria-label="Collapse all directory"]');
  await L.settle(page);
  await page.evaluate(() => document.activeElement?.blur());
  const seq = [];
  let reached = null;
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    const a = await page.evaluate(() => {
      const e = document.activeElement;
      const where = e.closest("aside")
        ? "aside"
        : e.closest("nav")
          ? "nav"
          : e.closest(".ag-root")
            ? "grid"
            : e.closest("main")
              ? "main"
              : "other";
      return {
        where,
        tag: e.tagName,
        label:
          e.getAttribute("aria-label") ??
          e.innerText?.trim().slice(0, 30) ??
          "",
        outline:
          getComputedStyle(e).outlineStyle !== "none" ||
          getComputedStyle(e).boxShadow !== "none",
      };
    });
    const key = `${a.where}:${a.tag}:${a.label}`;
    if (seq.length === 0 || seq[seq.length - 1].key !== key)
      seq.push({ key, n: i + 1, outline: a.outline });
    if (a.where === "grid" && a.label === "Copy") {
      reached = i + 1;
      break;
    }
  }
  const s = await L.shot(page, "8-2-keyboard-grid-copy");
  // #407: Enter and Space on the focused Copy show "Copied".
  const pressed = {};
  if (reached) {
    for (const key of ["Enter", "Space"]) {
      await page.evaluate(() => navigator.clipboard.writeText("-"));
      await page.keyboard.press(key);
      await L.sleep(200);
      pressed[key] = {
        snackbar: await page.evaluate(() =>
          [...document.querySelectorAll("*")]
            .filter((e) => e.children.length === 0 && e.getClientRects().length)
            .map((e) => e.textContent.trim())
            .filter((t) => /^(Copied|Copy failed)/.test(t)),
        ),
        clipboard: await page.evaluate(() => navigator.clipboard.readText()),
      };
      await L.sleep(2500);
    }
  }
  const areas = [...new Set(seq.map((x) => x.key.split(":")[0]))];
  const noOutline = seq
    .filter((x) => !x.outline)
    .map((x) => x.key)
    .slice(0, 10);
  L.rec(
    "8-2",
    reached ? "OK" : "NG",
    JSON.stringify({
      tabsToGridCopy: reached,
      areaOrder: areas,
      first: seq.slice(0, 6).map((x) => x.key),
      last: seq.slice(-6).map((x) => x.key),
      noVisibleFocus: noOutline,
    }),
    [s],
  );
  L.rec(
    "8-2-407",
    pressed.Enter?.clipboard &&
      pressed.Enter.clipboard !== "-" &&
      pressed.Space?.clipboard !== "-"
      ? "OK"
      : "NG",
    JSON.stringify(pressed),
  );
});

await L.step("8-4", page, async () => {
  const out = {};
  await page.goto(L.ROOT + "/eth/", { waitUntil: "load" });
  await L.settle(page, 800);
  out.chainContractsColumn = await page.evaluate(() =>
    [...document.querySelectorAll("main a")]
      .filter((a) => /\/contracts$/.test(a.getAttribute("href")))
      .map((a) => [a.getAttribute("href"), a.innerText]),
  );
  // #394: the RPC input has the aria-label "RPC URL"; #459: its placeholder.
  out.rpcInput = await page
    .$eval(L.RPC_INPUT, (i) => [i.getAttribute("aria-label"), i.placeholder])
    .catch((e) => String(e.message));
  // #406: the last column of the versions table is "Events".
  out.chainVersionsHeaders = await page.evaluate(() =>
    [
      ...document.querySelectorAll("main table th, main [role=columnheader]"),
    ].map((e) => e.innerText.trim()),
  );
  // function URL with a wrong name but a right selector
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.href =
      "/eth/Augur-version1/contracts/Augur/functions/wrongName-0x8892bb73/";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  await L.settle(page, 1000);
  out.wrongNameRightSelector = (await L.info(page)).h1;
  out.shot = await L.shot(page, "8-4-wrong-name-right-selector");
  // direct open of an unknown URL (static server: 404, like GitHub Pages without 404.html)
  const r = await page.goto(L.ROOT + "/eth/NoSuch-version1/", {
    waitUntil: "load",
  });
  out.directUnknownStatus = r?.status();
  // horizontal overflow at 390 (#398: scrollWidth 390), on the 9 pages of
  // PAGES in scripts/visual-compare/shots.mjs
  await page.setViewport({ width: 390, height: 844 });
  const widths = [];
  for (const [i, u] of [
    "/",
    "/eth/",
    "/eth/Augur-version1/",
    "/eth/Augur-version1/contracts/",
    "/eth/Augur-version1/contracts/Augur/",
    "/eth/Augur-version1/contracts/Augur/events/",
    "/eth/Augur-version1/contracts/Augur/events/MarketCreated/",
    "/eth/Augur-version1/contracts/Augur/functions/",
    "/eth/Augur-version1/contracts/Augur/functions/createChildUniverse-0x8892bb73/",
  ].entries()) {
    await page.goto(L.ROOT + u, { waitUntil: "load" });
    await L.settle(page, 600);
    out[`overflow390 ${u}`] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
      [...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.getBoundingClientRect().right > window.innerWidth + 1 &&
            e.getClientRects().length,
        )
        .slice(0, 4)
        .map(
          (e) =>
            e.tagName +
            "." +
            String(e.className).slice(0, 60) +
            " r=" +
            Math.round(e.getBoundingClientRect().right),
        ),
    ]);
    widths.push(out[`overflow390 ${u}`][0]);
    await page.evaluate(() => window.scrollTo(1000, 0));
    await L.shot(page, `8-4-overflow390-${i}`);
  }
  L.rec("8-4", "CHECK", JSON.stringify(out), [out.shot]);
  L.rec(
    "8-4-398",
    widths.every((w) => w === 390) ? "OK" : "NG",
    `scrollWidth at 390: ${JSON.stringify(widths)}`,
  );
  const last = out.chainVersionsHeaders.at(-1);
  L.rec(
    "8-4-406",
    last === "Events" ? "OK" : "CHECK",
    `chain page headers: ${JSON.stringify(out.chainVersionsHeaders)}`,
  );
});

L.rec("downloads58", "INFO", `${downloads.length} files`, [], { downloads });
await L.finish("sec58");
