import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { handleRequests, serveBuild } from "./browser.mjs";

let dir;
const servers = [];
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-lib-"));
  fs.mkdirSync(path.join(dir, "eth"));
  fs.writeFileSync(path.join(dir, "index.html"), "root");
  fs.writeFileSync(path.join(dir, "eth", "index.html"), "eth");
});
afterAll(() => {
  for (const server of servers) server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function start(options) {
  const server = serveBuild(dir, options);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

describe("serveBuild", () => {
  test.each([
    [".html", "text/html"],
    [".js", "text/javascript"],
    [".css", "text/css"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".json", "application/json"],
    [".woff2", "font/woff2"],
    [".ico", "image/x-icon"],
    [".webmanifest", "application/manifest+json"],
    [".txt", "text/plain"],
    [".wasm", "application/wasm"],
    [".bin", "application/octet-stream"],
  ])("serves %s as %s", async (ext, type) => {
    fs.writeFileSync(path.join(dir, `file${ext}`), "x");
    const res = await fetch(`${await start()}/file${ext}?v=1`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(type);
  });

  test("answers a missing file with 404", async () => {
    const res = await fetch(`${await start()}/missing.js`);
    expect(res.status).toBe(404);
  });

  test("serves the index.html of a folder", async () => {
    const base = await start();
    expect(await (await fetch(`${base}/`)).text()).toBe("root");
    expect(await (await fetch(`${base}/eth/`)).text()).toBe("eth");
  });

  test("serves only under the prefix", async () => {
    const base = await start({ prefix: "/Digu" });
    expect(await (await fetch(`${base}/Digu/eth/`)).text()).toBe("eth");
    expect((await fetch(`${base}/eth/`)).status).toBe(404);
    expect((await fetch(`${base}/Digufoo/`)).status).toBe(404);
  });

  test("adds the headers", async () => {
    const base = await start({ headers: { "cache-control": "no-store" } });
    const res = await fetch(`${base}/`);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toBe("text/html");
  });
});

// A page that keeps its request listener, and a request that records how it
// was handled.
function fakePage() {
  const page = { listeners: {}, interception: false };
  page.setRequestInterception = async (on) => {
    page.interception = on;
  };
  page.on = (event, listener) => {
    page.listeners[event] = listener;
  };
  return page;
}
function fakeRequest(url, handled = false) {
  const req = { handledAs: null };
  req.url = () => url;
  req.isInterceptResolutionHandled = () => handled;
  req.respond = (response) => (req.handledAs = ["respond", response.status]);
  req.abort = () => (req.handledAs = ["abort"]);
  req.continue = () => (req.handledAs = ["continue"]);
  return req;
}

describe("handleRequests", () => {
  const ORIGIN = "http://localhost:4173";
  async function setup() {
    const page = fakePage();
    const answered = [];
    const blocked = [];
    await handleRequests(page, {
      isLocal: (url) => url.origin === ORIGIN,
      answer: (req, url) => {
        if (
          url.hostname !== "fake-rpc.invalid" &&
          !url.pathname.includes("/warp-sync/")
        ) {
          return false;
        }
        answered.push(req.url());
        req.respond({ status: 200 });
        return true;
      },
      onBlocked: (url) => blocked.push(url),
    });
    const send = (url, handled) => {
      const req = fakeRequest(url, handled);
      page.listeners.request(req);
      return req.handledAs;
    };
    return { page, answered, blocked, send };
  }

  test("turns on the interception", async () => {
    const { page } = await setup();
    expect(page.interception).toBe(true);
  });

  test("answers the snapshot of eth with 404, also under /Digu", async () => {
    const { answered, send } = await setup();
    expect(send(`${ORIGIN}/warp-sync/eth/manifest.json`)).toEqual([
      "respond",
      404,
    ]);
    expect(
      send("http://localhost:4174/Digu/warp-sync/eth/manifest.json"),
    ).toEqual(["respond", 404]);
    expect(answered).toEqual([]);
  });

  test("gives the snapshot of matic to answer", async () => {
    const { answered, send } = await setup();
    const url = `${ORIGIN}/warp-sync/matic/manifest.json`;
    expect(send(url)).toEqual(["respond", 200]);
    expect(answered).toEqual([url]);
  });

  test("leaves a request to answer when it answers", async () => {
    const { answered, blocked, send } = await setup();
    expect(send("http://fake-rpc.invalid/")).toEqual(["respond", 200]);
    expect(answered).toEqual(["http://fake-rpc.invalid/"]);
    expect(blocked).toEqual([]);
  });

  test("aborts and reports an outside host", async () => {
    const { blocked, send } = await setup();
    expect(send("https://fonts.example.com/a.css")).toEqual(["abort"]);
    expect(blocked).toEqual(["https://fonts.example.com/a.css"]);
  });

  test("lets a local request and a non-http request go on", async () => {
    const { blocked, send } = await setup();
    expect(send(`${ORIGIN}/eth/`)).toEqual(["continue"]);
    expect(send("data:text/plain,x")).toEqual(["continue"]);
    expect(blocked).toEqual([]);
  });

  test("skips a request that another handler resolved", async () => {
    const { send } = await setup();
    expect(send(`${ORIGIN}/warp-sync/eth/manifest.json`, true)).toBe(null);
  });
});
