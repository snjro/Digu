"""Tests of check-snapshot.py on sample repositories.
Usage: python3 -B -m unittest discover -s scripts/warp-sync -p "*_test.py"
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

CHECK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-snapshot.py")
AT = "2026-10-08T12:00:00Z"


def run(created_at, to_block=26138967):
    return {"createdAt": created_at, "toBlock": to_block}


class CheckSnapshot(unittest.TestCase):
    def setUp(self):
        # check-snapshot.py reads the repository two folders above it, so a
        # copy of it in a sample repository reads that one.
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.script = os.path.join(self.root, "scripts/warp-sync/check-snapshot.py")
        os.makedirs(os.path.dirname(self.script))
        shutil.copy(CHECK, self.script)
        self.env = {
            k: v
            for k, v in os.environ.items()
            if k not in ("GITHUB_STEP_SUMMARY", "WARP_SYNC_SNAPSHOT_CHECK")
        }
        self.add_chain("ethereum-mainnet", "eth")
        self.add_chain("matic", "matic")
        self.write_manifest("eth", runs=[run("2026-10-01T00:00:00Z"), run("2026-10-08T00:30:00Z")])
        self.write_manifest("matic", runs=[run("2026-10-08T23:59:00Z", 77000000)])

    def tearDown(self):
        self.tmp.cleanup()

    def add_chain(self, folder, name):
        path = os.path.join(self.root, "src/constants/chains", folder, "_index.ts")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(f'export const chain: Chain = {{\n  name: "{name}",\n  chainId: 1,\n}};\n')

    def manifest_path(self, chain):
        return os.path.join(self.root, "static/warp-sync", chain, "manifest.json")

    def write_manifest(self, chain, runs, formatVersion=3):
        path = self.manifest_path(chain)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump({"formatVersion": formatVersion, "runs": runs}, f)

    def check(self, *args):
        return subprocess.run(
            [sys.executable, self.script, "--at", AT, *args],
            capture_output=True,
            text=True,
            env=self.env,
        )

    def test_snapshots_of_the_day_pass(self):
        p = self.check()
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertNotIn("::", p.stdout)
        self.assertIn(
            "| eth | run 2 | 2026-10-08 00:30 UTC | 26,138,967 | 0.5 |", p.stdout
        )
        self.assertIn("| matic | run 1 | 2026-10-08 23:59 UTC | 77,000,000 |", p.stdout)

    def test_a_snapshot_of_another_day_fails(self):
        self.write_manifest("eth", runs=[run("2026-10-07T23:59:00Z")])
        p = self.check()
        self.assertEqual(p.returncode, 1)
        errors = [line for line in p.stdout.splitlines() if line.startswith("::")]
        self.assertEqual(len(errors), 1, p.stdout)
        self.assertTrue(
            errors[0].startswith(
                "::error::The warp sync snapshot of eth was made on 2026-10-07,"
            ),
            errors[0],
        )

    def test_the_day_is_in_utc(self):
        p = self.check("--at", "2026-10-09T08:00:00+09:00")
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("release on 2026-10-08", p.stdout)
        p = self.check("--at", "2026-10-09T09:00:00+09:00")
        self.assertEqual(p.returncode, 1)
        self.assertIn("release on 2026-10-09", p.stdout)

    def test_off_warns_instead_of_failing(self):
        self.write_manifest("eth", runs=[run("2026-10-07T00:00:00Z")])
        self.env["WARP_SYNC_SNAPSHOT_CHECK"] = "off"
        p = self.check()
        self.assertEqual(p.returncode, 0)
        self.assertIn("::warning::The warp sync snapshot of eth", p.stdout)
        self.assertNotIn("::error::", p.stdout)
        self.assertIn("WARP_SYNC_SNAPSHOT_CHECK is off", p.stdout)

    def test_a_chain_without_a_snapshot_is_not_checked(self):
        os.remove(self.manifest_path("matic"))
        p = self.check()
        self.assertEqual(p.returncode, 0, p.stdout)
        self.assertIn("| matic | No snapshot |  |  |  |", p.stdout)

    def test_no_chain_fails(self):
        shutil.rmtree(os.path.join(self.root, "src"))
        p = self.check()
        self.assertEqual(p.returncode, 1)
        self.assertIn("::error::No chain found", p.stdout)

    def test_a_manifest_that_cannot_be_read_fails(self):
        cases = {
            "formatVersion 2": lambda: self.write_manifest(
                "eth", runs=[run("2026-10-08T00:00:00Z")], formatVersion=2
            ),
            "no run": lambda: self.write_manifest("eth", runs=[]),
            "no createdAt": lambda: self.write_manifest("eth", runs=[{"toBlock": 1}]),
            "not JSON": lambda: open(self.manifest_path("eth"), "w").close(),
        }
        for case, write in cases.items():
            with self.subTest(case):
                write()
                p = self.check()
                self.assertEqual(p.returncode, 1, p.stdout)
                self.assertIn(
                    "::error::Warp sync snapshot of eth: cannot read"
                    " static/warp-sync/eth/manifest.json",
                    p.stdout,
                )
                self.assertIn("| eth | Cannot read the manifest |", p.stdout)

    def test_the_table_goes_to_the_summary_of_the_step(self):
        summary = os.path.join(self.root, "summary.md")
        self.env["GITHUB_STEP_SUMMARY"] = summary
        p = self.check()
        self.assertEqual(p.returncode, 0)
        self.assertEqual(p.stdout, "")
        with open(summary) as f:
            self.assertIn("| eth | run 2 |", f.read())


if __name__ == "__main__":
    unittest.main()
