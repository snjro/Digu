"""Tests of judge.py on sample <out-dir>s.
Usage: python3 -B -m unittest discover -s scripts/screen-check -p "*_test.py"
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

JUDGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "judge.py")
sys.path.insert(0, os.path.dirname(JUDGE))
from judge import NO_RESULTS, RESULTS  # noqa: E402


def ok(id_):
    return {"id": id_, "result": "OK", "note": "fine"}


class Judge(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = self.tmp.name
        # A run with every step at exit 0, upgrade B skipped, and one record
        # of each passing kind in each results file.
        self.codes = {s: "0" for s in [*RESULTS, *NO_RESULTS]}
        self.codes["upgrade-b-new"] = "skipped (no --upgrade-b)"
        for step, path in RESULTS.items():
            if step != "upgrade-b-new":
                self.write(
                    path,
                    [
                        ok(f"{step} a"),
                        {"id": f"{step} b", "result": "CHECK", "note": "look"},
                        {"id": f"{step} c", "result": "INFO", "note": {"n": 1}},
                    ],
                )

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path, records):
        full = os.path.join(self.out, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as f:
            json.dump({"log": [], "results": records}, f)

    def run_judge(self):
        with open(os.path.join(self.out, "exit-codes.txt"), "w") as f:
            f.writelines(f"{s} {c}\n" for s, c in self.codes.items())
        p = subprocess.run(
            [sys.executable, JUDGE, self.out], capture_output=True, text=True
        )
        lines = p.stdout.splitlines()
        self.assertEqual(lines[-1], f"{len(lines) - 1} failures")
        self.assertEqual(p.returncode, 1 if len(lines) > 1 else 0)
        return lines[:-1]

    def test_a_good_run_passes(self):
        self.assertEqual(self.run_judge(), [])

    def test_upgrade_b_is_read_when_it_ran(self):
        self.codes["upgrade-b-new"] = "0"
        self.assertEqual(
            self.run_judge(),
            ["upgrade-b-new: cannot read results-new.json "
             "([Errno 2] No such file or directory: "
             f"'{os.path.join(self.out, 'upgrade-b/results-new.json')}')"],
        )

    def test_only_the_results_file_of_the_step_is_read(self):
        # Copied by --upgrade-b from an older run.
        self.write("upgrade-b/results-old.json", [{"id": "x", "result": "NG"}])
        self.write("ui/results-old.json", [{"id": "x", "result": "NG"}])
        self.assertEqual(self.run_judge(), [])

    def test_ng(self):
        self.write("sync/results-sync.json", [ok("S1 a"), {
            "id": "S1 6-2 reached latest", "result": "NG", "note": {"error": "x"}}])
        self.assertEqual(
            self.run_judge(),
            ['sync-check S1 6-2 reached latest: NG {"error": "x"}'],
        )

    def test_error_prints_the_first_line(self):
        self.write("upgrade/results-new.json", [{
            "id": "new error", "result": "ERROR",
            "note": "script exception: Error: boom\n    at x.mjs:1"}])
        self.assertEqual(
            self.run_judge(),
            ["upgrade-new new error: ERROR script exception: Error: boom"],
        )

    def test_a_record_without_result(self):
        self.write("ui/results-sec4.json", [ok("4-1"), {"id": "downloads"}])
        self.assertEqual(
            self.run_judge(), ["ui-sec4 downloads: unknown result None null"]
        )

    def test_a_record_with_an_unknown_result(self):
        self.write("ui/results-sec2.json", [{"id": "2-1", "result": "ok",
                                             "note": "x"}])
        self.assertEqual(
            self.run_judge(), ["ui-sec2 2-1: unknown result 'ok' x"]
        )

    def test_a_record_that_is_not_an_object(self):
        self.write("ui/results-sec2.json", [ok("2-1"), "OK"])
        self.assertEqual(
            self.run_judge(), ["ui-sec2: a record is not an object: OK"]
        )

    def test_a_step_without_its_results_file(self):
        os.remove(os.path.join(self.out, RESULTS["real-rpc-fake"]))
        lines = self.run_judge()
        self.assertEqual(len(lines), 1)
        self.assertTrue(
            lines[0].startswith("real-rpc-fake: cannot read results-real-rpc.json"),
            lines[0],
        )

    def test_a_results_file_with_no_records(self):
        self.write(RESULTS["upgrade-grid"], [])
        self.assertEqual(
            self.run_judge(), ["upgrade-grid: no records in results-grid.json"]
        )

    def test_a_results_file_that_is_not_json(self):
        with open(os.path.join(self.out, RESULTS["ui-extra"]), "w") as f:
            f.write("{")
        lines = self.run_judge()
        self.assertEqual(len(lines), 1)
        self.assertTrue(
            lines[0].startswith("ui-extra: cannot read results-extra.json"),
            lines[0],
        )

    def test_a_step_that_judge_does_not_know(self):
        self.codes["ui-sec9"] = "0"
        self.assertEqual(
            self.run_judge(), ["ui-sec9: judge.py does not know its results file"]
        )

    def test_a_step_that_did_not_end_with_0(self):
        self.codes["sync-smoke"] = "1"
        self.codes["ui-merge"] = "missing"
        self.assertCountEqual(
            self.run_judge(), ["sync-smoke: exit 1", "ui-merge: exit missing"]
        )

    def test_without_exit_codes(self):
        p = subprocess.run(
            [sys.executable, JUDGE, self.out], capture_output=True, text=True
        )
        self.assertEqual(p.returncode, 1)
        self.assertTrue(p.stdout.startswith("exit-codes.txt: cannot read"))


if __name__ == "__main__":
    unittest.main()
