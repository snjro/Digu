import { describe, expect, test } from "vitest";
import type { WarpSyncState } from "./warpSyncState";
import {
  formatBytes,
  formatDuration,
  getConfirmationTexts,
  getImportProgressText,
} from "./warpSyncTexts";

describe("formatBytes", () => {
  test.each([
    [0, "1 KB"],
    [427_701, "428 KB"],
    [194_000_000, "194 MB"],
    [1_816_000_000, "1.8 GB"],
  ])("%d is %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe("formatDuration", () => {
  test.each([
    [20, "less than a minute"],
    [60, "1 minute"],
    [518, "9 minutes"],
    [7_140, "119 minutes"],
    [7_199, "2 hours"],
    [3 * 3_600, "3 hours"],
  ])("%d s is %s", (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

const state: WarpSyncState = {
  status: "confirm",
  toBlock: 26_073_896,
  createdAt: "2026-10-01T00:00:00.000Z",
  pending: {
    logCount: 2_328_259,
    snapshotLogCount: 2_328_259,
    bytes: 194_000_000,
    rawBytes: 1_816_000_000,
    files: 118,
  },
};

describe("getConfirmationTexts", () => {
  test("a first import, with the free space", () => {
    expect(
      getConfirmationTexts("Ethereum Mainnet", state, 38_000_000_000),
    ).toEqual({
      header: "Import the event logs published with this site?",
      lines: [
        "Ethereum Mainnet: 2,328,259 logs up to block 26,073,896 (2026-10-01).",
        "Download: 194 MB. Stored in this browser: about 698 MB.",
        "Time: about 2 minutes on a desktop computer; slower on a phone.",
        "You can use Digu while it imports, stop it at any time, and go on later.",
        "Free space for this site: 38.0 GB.",
      ],
      warning: undefined,
    });
  });

  test("an import that goes on, without the free space", () => {
    const texts = getConfirmationTexts(
      "Ethereum Mainnet",
      { ...state, pending: { ...state.pending!, logCount: 1_200_000 } },
      undefined,
    );
    expect(texts.header).toBe(
      "Import the rest of the event logs published with this site?",
    );
    expect(texts.lines[0]).toBe(
      "Ethereum Mainnet: 1,200,000 of 2,328,259 logs are left, up to block 26,073,896 (2026-10-01).",
    );
    expect(texts.lines).toHaveLength(4);
  });

  test("warns when the browser may not have the space", () => {
    expect(
      getConfirmationTexts("Ethereum Mainnet", state, 500_000_000).warning,
    ).toBe(
      "This browser may not have enough space for this site: about 698 MB is needed, 500 MB is free.",
    );
  });
});

describe("getImportProgressText", () => {
  const importing: WarpSyncState = {
    ...state,
    status: "importing",
    progress: { doneLogCount: 0, startedAt: 1_000_000 },
  };
  test("without progress yet", () => {
    expect(getImportProgressText({ status: "importing" }, 0)).toBe(
      "Importing logs",
    );
    expect(getImportProgressText(importing, 1_010_000)).toBe(
      "Importing logs 0%",
    );
  });
  test("the percent and the time left", () => {
    // 582,065 of 2,328,259 logs (25%) in 120 s: 360 s left.
    expect(
      getImportProgressText(
        {
          ...importing,
          progress: { doneLogCount: 582_065, startedAt: 1_000_000 },
        },
        1_120_000,
      ),
    ).toBe("Importing logs 25% · 6 minutes left");
  });
});
