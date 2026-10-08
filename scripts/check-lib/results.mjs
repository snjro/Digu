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
    records.push({ ...fields, id, result, note });
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
    // Runs a scenario. An exception becomes a record (ERROR, or `result`),
    // and the script goes on. `onError(e)` may give more fields, such as a
    // screenshot.
    async guard(id, fn, { onError = () => ({}), result = "ERROR" } = {}) {
      try {
        await fn();
      } catch (e) {
        let fields = {};
        try {
          fields = (await onError(e)) ?? {};
        } catch {
          // keep the record without them
        }
        add(
          id,
          result,
          `script exception: ${String(e?.stack ?? e).slice(0, 2000)}`,
          fields,
        );
      }
    },
  };
}

// The records of the checks that keep their own file for a person (sync and
// real-rpc). `keep(key, value)` writes a value to that file. note() also
// writes an INFO record, check() an OK or NG one, and guard() turns an
// exception of a scenario into ERROR. The ids are `${prefix()} ${key}`.
// While `judged()` is false, check() and guard() write INFO instead.
export function createChecks({ file, prefix, keep, judged = () => true }) {
  const results = createResults({ file });
  const id = (key) => `${prefix()} ${key}`;
  return {
    records: results.records,
    note(key, value) {
      keep(key, value);
      results.add(id(key), "INFO", value);
    },
    check(key, ok, value = {}) {
      keep(key, { ok, ...value });
      if (judged()) results.check(id(key), ok, value);
      else results.add(id(key), "INFO", { ok, ...value });
    },
    // `onError(e)` runs after the error is kept, for a screenshot.
    guard(fn, onError = () => {}) {
      return results.guard(id("error"), fn, {
        onError: async (e) => {
          keep("error", String(e?.stack ?? e));
          await onError(e);
        },
        result: judged() ? "ERROR" : "INFO",
      });
    },
  };
}
