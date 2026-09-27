// Checks the fake RPC with ethers before any browser run.
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { handle, makeState, contracts, expected } from "./fake-rpc.mjs";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { JsonRpcProvider, Contract } = require("ethers");

const state = makeState();
const server = http.createServer((req, res) => {
  let s = "";
  req.on("data", (c) => (s += c));
  req.on("end", () => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(handle(state, JSON.parse(s))));
  });
});
await new Promise((r) => server.listen(18545, "127.0.0.1", r));
const provider = new JsonRpcProvider("http://127.0.0.1:18545", undefined, {
  batchMaxSize: 1,
});
console.log("network", (await provider.getNetwork()).chainId);
console.log("latest", await provider.getBlockNumber());
const b = await provider.getBlock(5926229 + 55);
console.log("block", b.number, b.timestamp);
const augur = Object.values(contracts).find(
  (c) => c.version === "version1" && c.name === "Augur",
);
const c = new Contract(augur.address, augur.iface.fragments, provider);
const logs = await c.queryFilter("MarketCreated", 5926229, 5926229 + 99);
console.log(
  "logs",
  logs.length,
  logs.map((l) => [
    l.constructor.name,
    l.blockNumber,
    l.eventName,
    String(l.args[1]).slice(0, 40),
  ]),
);
const u = await c.queryFilter("UniverseCreated", 5926229, 5926229 + 250);
console.log("universe", u.length, u[0]?.args?.toArray());
console.log("expected", expected.length);
console.log("methods", state.calls.map((x) => x.method).join(","));
provider.destroy();
server.close();
