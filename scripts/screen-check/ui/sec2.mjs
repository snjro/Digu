// Section 2: nav, sidebar, look.
import * as L from "./lib.mjs";
await L.startServers();
await L.launch();
const { page } = await L.newContextPage(1400, 900);
const SB = L.SIDEBAR;
const EV = L.ROOT + "/eth/Augur-version1/contracts/Augur/events/MarketCreated/";
await page.goto(EV, { waitUntil: "load" });
await L.settle(page, 800);
const us = async (p = page) =>
  (await L.idb(p)).Digu_Settings?.UserSettings?.[0];

await L.step("2-1", page, async () => {
  const d0 = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  await page.click('nav button[aria-label="Change theme"]');
  await L.settle(page);
  const d1 = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  const u1 = (await us()).themeColor;
  const bg = await page.evaluate(() => [
    getComputedStyle(document.body).backgroundColor,
    getComputedStyle(document.querySelector("main") ?? document.body)
      .backgroundColor,
  ]);
  const s1 = await L.shot(page, "2-1-dark");
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 800);
  const d2 = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  const s2 = await L.shot(page, "2-1-dark-after-reload");
  // dark shots for 8-3
  const shots = [s1, s2];
  for (const [n, u] of [
    ["contracts", "/eth/Augur-version2/contracts/"],
    ["abi", "/eth/Augur-version1/contracts/Augur/#abi"],
    ["version", "/eth/Augur-version1/"],
    ["sync-panel", null],
  ]) {
    if (u) {
      await page.goto(L.ROOT + u, { waitUntil: "load" });
      await L.settle(page, 800);
    } else {
      await L.openSyncPanel(page);
    }
    shots.push(await L.shot(page, `8-3-dark-${n}`));
  }
  await page.keyboard.press("Escape");
  await page.click('nav button[aria-label="Change theme"]');
  await L.settle(page);
  const d3 = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  const ok = !d0 && d1 && u1 === "dark" && d2 && !d3;
  L.rec(
    "2-1",
    ok ? "OK" : "NG",
    JSON.stringify({
      before: d0,
      afterClick: d1,
      db: u1,
      bg,
      afterReload: d2,
      toggledBack: d3,
    }),
    shots,
  );
});

await L.step("2-2", page, async () => {
  await page.goto(EV, { waitUntil: "load" });
  await L.settle(page, 800);
  const vis = () =>
    page.evaluate(
      (SB) =>
        !!document.querySelector(SB)?.getClientRects().length &&
        document.querySelector(SB).getBoundingClientRect().right > 10,
      SB,
    );
  const v0 = await vis();
  await page.click(L.CLOSE_SIDEBAR);
  await L.settle(page);
  const v1 = await vis();
  const u1 = (await us()).isOpenSidebar;
  const s1 = await L.shot(page, "2-2-closed");
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 800);
  const v2 = await vis();
  const openBtn = await page.$('button[aria-label="Open sidebar"]');
  await openBtn?.click();
  await L.settle(page);
  const v3 = await vis();
  const u3 = (await us()).isOpenSidebar;
  await page.reload({ waitUntil: "load" });
  await L.settle(page, 800);
  const v4 = await vis();
  const ok =
    v0 && !v1 && u1 === false && !v2 && !!openBtn && v3 && u3 === true && v4;
  L.rec(
    "2-2",
    ok ? "OK" : "NG",
    JSON.stringify({
      open: v0,
      afterClose: v1,
      db: u1,
      afterReload: v2,
      openButton: !!openBtn,
      afterOpen: v3,
      db2: u3,
      afterReload2: v4,
    }),
    [s1],
  );
});

await L.step("2-3", page, async () => {
  const exp = () =>
    page.evaluate((SB) => {
      const t = [...document.querySelectorAll(`${SB} [aria-expanded]`)];
      return {
        total: t.length,
        open: t.filter((e) => e.getAttribute("aria-expanded") === "true")
          .length,
        links: document.querySelectorAll(`${SB} a`).length,
      };
    }, SB);
  const e0 = await exp();
  await page.click('button[aria-label="Expand all directory"]');
  await L.settle(page, 600);
  const e1 = await exp();
  const s1 = await L.shot(page, "2-3-expand-all");
  await page.click('button[aria-label="Collapse all directory"]');
  await L.settle(page, 400);
  const e2 = await exp();
  const s2 = await L.shot(page, "2-3-collapse-all");
  await page.click('button[aria-label="Expand selected directory"]');
  await L.settle(page, 400);
  const e3 = await exp();
  const s3 = await L.shot(page, "2-3-expand-selected");
  // arrow click, Enter, Space on "Toggle Augur version2"
  const t = `${SB} [aria-label="Toggle Augur version2"]`;
  const a0 = await page.$eval(t, (e) => e.getAttribute("aria-expanded"));
  await page.click(t);
  await L.settle(page, 200);
  const a1 = await page.$eval(t, (e) => e.getAttribute("aria-expanded"));
  await page.focus(t);
  await page.keyboard.press("Enter");
  await L.settle(page, 200);
  const a2 = await page.$eval(t, (e) => e.getAttribute("aria-expanded"));
  await page.keyboard.press("Space");
  await L.settle(page, 200);
  const a3 = await page.$eval(t, (e) => e.getAttribute("aria-expanded"));
  const scrollY = await page.evaluate(() => window.scrollY);
  const tabIndex = await page.$eval(t, (e) => e.tabIndex);
  const ok =
    e1.open === e1.total &&
    e2.open === 0 &&
    e3.open > 0 &&
    e3.open < e1.total &&
    a0 === "false" &&
    a1 === "true" &&
    a2 === "false" &&
    a3 === "true";
  L.rec(
    "2-3",
    ok ? "OK" : "NG",
    JSON.stringify({
      initial: e0,
      expandAll: e1,
      collapseAll: e2,
      expandSelected: e3,
      arrow: [a0, a1, a2, a3],
      tabIndex,
      windowScrollAfterSpace: scrollY,
    }),
    [s1, s2, s3],
  );
});

await L.step("2-5", page, async () => {
  const f = await page.evaluate(() =>
    [...document.querySelectorAll("aside a[target]")].map((a) => [
      a.getAttribute("aria-label") ?? a.innerText.trim(),
      a.href,
      a.target,
      a.rel,
    ]),
  );
  // The version comes from package.json (FooterVersion.svelte), so any vX.Y.Z.
  const ok =
    f.some(
      (x) => x[1] === "https://github.com/snjro/Digu" && x[2] === "_blank",
    ) &&
    f.some(
      (x) => /releases\/tag\/v\d+\.\d+\.\d+$/.test(x[1]) && x[2] === "_blank",
    );
  L.rec("2-5", ok ? "OK" : "NG", JSON.stringify(f));
});

// 2-4 narrow width
await L.step("2-4", page, async () => {
  const { ctx: c2, page: p } = await L.newContextPage(390, 844, "narrow");
  const shots = [];
  await p.goto(EV, { waitUntil: "load" });
  await L.settle(p, 800);
  const sbVis = () =>
    p.evaluate((SB) => {
      const r = document.querySelector(SB)?.getBoundingClientRect();
      return r
        ? {
            left: Math.round(r.left),
            right: Math.round(r.right),
            w: Math.round(r.width),
          }
        : null;
    }, SB);
  const s0 = await sbVis();
  shots.push(await L.shot(p, "2-4-narrow-initial"));
  // click outside the sidebar
  await p.mouse.click(380, 500);
  await L.settle(p);
  const s1 = await sbVis();
  shots.push(await L.shot(p, "2-4-narrow-after-outside-click"));
  const tabs = await p.$$eval("main a[href^='#']", (as) =>
    as.filter((a) => a.getClientRects().length).map((a) => a.innerText.trim()),
  );
  const navBtns = await L.dumpControls(p, "nav");
  // The nav in one row, with no "three dots" menu: the RPC input, the toggle,
  // the progress and the theme button.
  const navRow = await p.evaluate(() => {
    const nav = document.querySelector("nav").getBoundingClientRect();
    return {
      more: !!document.querySelector('nav button[aria-label="More"]'),
      controls: [...document.querySelectorAll("nav button, nav input")]
        .filter((e) => e.getClientRects().length)
        .map((e) => {
          const r = e.getBoundingClientRect();
          return [
            e.getAttribute("aria-label") ?? e.type,
            r.top >= nav.top && r.bottom <= nav.bottom && r.right <= innerWidth,
          ];
        }),
    };
  });
  // The sync panel, as wide as the window.
  await L.openSyncPanel(p);
  const syncPanel = await p.evaluate(() => {
    const r = document.getElementById("sync-panel").getBoundingClientRect();
    return { left: Math.round(r.left), width: Math.round(r.width) };
  });
  shots.push(await L.shot(p, "2-4-narrow-sync-panel"));
  await p.keyboard.press("Escape");
  await L.settle(p);
  // open sidebar, click a tree item: closes on narrow
  const ob = await p.$('button[aria-label="Open sidebar"]');
  await ob?.click();
  await L.settle(p);
  const s2 = await sbVis();
  shots.push(await L.shot(p, "2-4-narrow-sidebar-open"));
  await L.click(p, "Home", { scope: SB }).catch(() => {});
  await L.settle(p);
  const s3 = await sbVis();
  const url3 = await p.evaluate(() => location.pathname);
  shots.push(await L.shot(p, "2-4-narrow-after-tree-click"));
  L.rec(
    "2-4",
    "CHECK",
    JSON.stringify({
      sidebarInitial: s0,
      afterOutsideClick: s1,
      tabs,
      navButtons: navBtns,
      navRow,
      syncPanel,
      afterOpen: s2,
      afterTreeClick: [s3, url3],
    }),
    shots,
  );
  // 768 look
  await p.setViewport({ width: 768, height: 1024 });
  await p.goto(L.ROOT + "/eth/Augur-version2/contracts/", {
    waitUntil: "load",
  });
  await L.settle(p, 800);
  L.rec("2-4-768", "CHECK", "768x1024 contracts", [
    await L.shot(p, "2-4-768-contracts"),
  ]);
  await c2.close();
});

await L.finish("sec2");
