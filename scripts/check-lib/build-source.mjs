// Values read from the source of the build under check, so that the checks
// follow the build. It imports only node:*, like browser.mjs.
import fs from "node:fs";
import path from "node:path";

// TRY_COUNT of src/eventLogs/eventLogsContract.ts: the errors after which
// the sync stops. `app` is the folder of the build (/app in the test service).
export function readTryCount(app = "/app") {
  const file = path.join(app, "src/eventLogs/eventLogsContract.ts");
  const m = fs
    .readFileSync(file, "utf8")
    .match(/export const TRY_COUNT\b[^=]*=\s*(\d+)/);
  if (!m) throw new Error(`no TRY_COUNT in ${file}`);
  return Number(m[1]);
}
