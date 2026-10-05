// The static server, the request rules and the page logging shared by the
// browser checks (scripts/screen-check, visual-compare and a11y-scan).
// It imports only node:*, because /scripts has no node_modules in the
// containers. The callers pass their puppeteer pages.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

// The import of the warp sync snapshot of these chains asks first (eth is
// large), and its dialog covers the page (#604). Their snapshot requests get
// 404, so they sync without it.
export const BLOCKED_SNAPSHOT_CHAINS = ["eth"];

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".wasm": "application/wasm",
};

// Serves `dir` like GitHub Pages: a folder serves its index.html. With
// `prefix` (such as "/Digu"), nothing is served outside it. `headers` are
// added to each file.
export function serveBuild(dir, { prefix = "", headers = {} } = {}) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (prefix) {
      if (!p.startsWith(prefix + "/")) {
        res.writeHead(404).end("not found (outside prefix)");
        return;
      }
      p = p.slice(prefix.length);
    }
    let file = path.join(dir, p);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      ...headers,
    });
    fs.createReadStream(file).pipe(res);
  });
}

// Turns on request interception. In order: the snapshot of a blocked chain
// gets 404; `answer(req, url)` may answer (it returns true synchronously when
// it did); an http(s) request that is not `isLocal(url)` goes to `onBlocked`
// and is aborted; the rest goes on.
export async function handleRequests(
  page,
  { isLocal, answer = () => false, onBlocked = () => {} },
) {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.isInterceptResolutionHandled()) return;
    const url = new URL(req.url());
    if (
      BLOCKED_SNAPSHOT_CHAINS.some((chain) =>
        url.pathname.includes(`/warp-sync/${chain}/`),
      )
    ) {
      req.respond({ status: 404, body: "" });
    } else if (answer(req, url)) {
      return;
    } else if (url.protocol.startsWith("http") && !isLocal(url)) {
      onBlocked(req.url());
      req.abort();
    } else {
      req.continue();
    }
  });
}

// Gives `onEntry` the console errors and warnings ({ type, text, message }),
// the page errors ({ type: "pageerror", text }) and the CSP violations
// ({ type: "csp", text }) of the page.
export async function logPageProblems(page, onEntry) {
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || type === "warn" || type === "warning") {
      onEntry({ type, text: message.text(), message });
    }
  });
  page.on("pageerror", (e) =>
    onEntry({ type: "pageerror", text: String(e.message ?? e) }),
  );
  // On window, because a blocked fetch or WebSocket has no element to fire at.
  await page.exposeFunction("__logCspViolation", (text) =>
    onEntry({ type: "csp", text: String(text) }),
  );
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      window.__logCspViolation(
        `${e.effectiveDirective} ${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
}
