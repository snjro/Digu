// The one result shape of the screen checks, read by
// scripts/screen-check/judge.py: a file { results: [{ id, result, note }],
// ... }. It imports only node:*, like browser.mjs.
import fs from "node:fs";

// OK and NG are judged, CHECK is left to a person, ERROR is an exception in
// the script, INFO is a record that is not judged on purpose.
export const RESULTS = Object.freeze(["OK", "NG", "CHECK", "ERROR", "INFO"]);

// With `file`, the records go to it each time one is added, so a script
// stopped on the way keeps what it found. It is written empty at once, in
// place of a file of an earlier run. Without it, nothing is written until
// writeTo(file). `extra()` gives the other fields of the file.
export function createResults({ file, extra = () => ({}) } = {}) {
  const records = [];
  const save = () => {
    if (!file) return;
    fs.writeFileSync(
      file,
      JSON.stringify(
        { ...extra(), results: records },
        (k, v) => (typeof v === "bigint" ? `${v}n` : v),
        2,
      ),
    );
  };
  const add = (id, result, note, fields = {}) => {
    if (!RESULTS.includes(result))
      throw new Error(`${id}: ${result} is not one of ${RESULTS.join(", ")}`);
    records.push({ id, result, note, ...fields });
    save();
  };
  save();
  return {
    records,
    save,
    writeTo(f) {
      file = f;
      save();
    },
    add,
    check: (id, ok, note, fields) => add(id, ok ? "OK" : "NG", note, fields),
    // Runs a scenario. An exception becomes an ERROR record, and the script
    // goes on. `onError(e)` may give more fields, such as a screenshot.
    async guard(id, fn, onError = () => ({})) {
      try {
        await fn();
      } catch (e) {
        let fields = {};
        try {
          fields = (await onError(e)) ?? {};
        } catch {
          // keep the ERROR record without them
        }
        add(
          id,
          "ERROR",
          `script exception: ${String(e?.stack ?? e).slice(0, 2000)}`,
          fields,
        );
      }
    },
  };
}
