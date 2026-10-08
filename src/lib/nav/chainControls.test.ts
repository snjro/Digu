import { describe, expect, test } from "vitest";
import type { NodeStatus } from "#db/dbTypes.js";
import type { ChainActivity } from "#eventLogs/chainActivity.js";
import type { WarpSyncState } from "#warpSync/warpSyncState.js";
import {
  canImportNow,
  getResetDisabledReason,
  isChainSettingDisabled,
  isSyncToggleDisabled,
  type SyncToggleConditions,
} from "./chainControls";

const BUSY: ChainActivity[] = [
  "syncing",
  "stopping",
  "otherTab",
  "smallImport",
  "largeImport",
  "resetting",
];
const ALL: ChainActivity[] = ["free", ...BUSY];

const enabled: SyncToggleConditions = {
  nodeStatus: "SUCCESS",
  isSyncTarget: true,
  isToggleOn: false,
  isStarting: false,
};

describe("isSyncToggleDisabled", () => {
  test("should be enabled when the node is ready and nothing blocks it", () => {
    expect(isSyncToggleDisabled("free", enabled)).toBe(false);
  });

  test.each<NodeStatus>([
    "CONNECTING",
    "INVALID_URL",
    "INVALID_PROTOCOL",
    "NETWORK_ERROR",
    "WRONG_CHAIN",
    undefined,
  ])("should be disabled when the node status is %j", (nodeStatus) => {
    expect(isSyncToggleDisabled("free", { ...enabled, nodeStatus })).toBe(true);
  });

  test("should be disabled when the chain is not a sync target", () => {
    expect(
      isSyncToggleDisabled("free", { ...enabled, isSyncTarget: false }),
    ).toBe(true);
  });

  test.each<NodeStatus>([
    "CONNECTING",
    "INVALID_URL",
    "INVALID_PROTOCOL",
    "NETWORK_ERROR",
    "WRONG_CHAIN",
    undefined,
  ])(
    "should be enabled to stop the sync when the node status is %j",
    (nodeStatus) => {
      expect(
        isSyncToggleDisabled("syncing", {
          ...enabled,
          isToggleOn: true,
          nodeStatus,
        }),
      ).toBe(false);
    },
  );

  test("should be enabled to stop the sync when the chain is not a sync target", () => {
    expect(
      isSyncToggleDisabled("syncing", {
        ...enabled,
        isToggleOn: true,
        isSyncTarget: false,
      }),
    ).toBe(false);
  });

  test.each(ALL)("should be disabled while starting, when %s", (activity) => {
    expect(
      isSyncToggleDisabled(activity, {
        ...enabled,
        isToggleOn: true,
        isStarting: true,
      }),
    ).toBe(true);
  });

  test("should be disabled while the sync of this tab starts or ends and the toggle is off", () => {
    expect(isSyncToggleDisabled("syncing", enabled)).toBe(true);
  });

  test.each<ChainActivity>(["stopping", "otherTab", "resetting"])(
    "should be disabled, on or off, when %s",
    (activity) => {
      expect(isSyncToggleDisabled(activity, enabled)).toBe(true);
      expect(
        isSyncToggleDisabled(activity, { ...enabled, isToggleOn: true }),
      ).toBe(true);
    },
  );

  test("should be disabled during a large import, but not a small one, which the sync waits for", () => {
    expect(isSyncToggleDisabled("largeImport", enabled)).toBe(true);
    expect(isSyncToggleDisabled("smallImport", enabled)).toBe(false);
    expect(
      isSyncToggleDisabled("smallImport", { ...enabled, isSyncTarget: false }),
    ).toBe(true);
  });
});

describe("getResetDisabledReason", () => {
  test("can reset a free chain", () => {
    expect(getResetDisabledReason("free")).toBeUndefined();
  });

  test.each<[ChainActivity, string]>([
    ["syncing", "Stop the sync first."],
    ["stopping", "Wait until the sync stops."],
    ["otherTab", "Stop the sync in the other tab first."],
    [
      "smallImport",
      "Wait until the logs published with this site are imported, or stop the import.",
    ],
    [
      "largeImport",
      "Wait until the logs published with this site are imported, or stop the import.",
    ],
    ["resetting", "Resetting…"],
  ])("says why it cannot reset when %s", (activity, reason) => {
    expect(getResetDisabledReason(activity)).toBe(reason);
  });
});

describe("canImportNow", () => {
  const pending = {
    logCount: 1_200_000,
    snapshotLogCount: 2_328_259,
    bytes: 101_000_000,
    rawBytes: 0,
    files: 60,
  };

  test.each(ALL)(
    "can import after Not now or a stop, also when %s",
    (activity) => {
      for (const status of ["declined", "stopped"] as const) {
        expect(canImportNow(activity, true, { status, pending })).toBe(true);
        expect(canImportNow(activity, false, { status, pending })).toBe(false);
      }
    },
  );

  test("cannot import now in the other states", () => {
    const states: WarpSyncState[] = [
      { status: "confirm" },
      { status: "checking" },
      { status: "importing" },
    ];
    for (const state of states) {
      expect(canImportNow("free", true, state)).toBe(false);
    }
  });
});

describe("isChainSettingDisabled", () => {
  test("lets the settings of a free chain change", () => {
    expect(isChainSettingDisabled("free")).toBe(false);
  });

  test.each(BUSY)("disables them when %s", (activity) => {
    expect(isChainSettingDisabled(activity)).toBe(true);
  });
});
