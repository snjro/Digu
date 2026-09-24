import { describe, expect, test } from "vitest";
import type { NodeStatus, SyncStateText } from "@db/dbTypes";
import {
  isSyncToggleDisabled,
  type SyncToggleConditions,
} from "./syncToggleDisabled";

const enabled: SyncToggleConditions = {
  nodeStatus: "SUCCESS",
  isSyncTarget: true,
  isToggleOn: false,
  syncStateText: "stopped",
  isStarting: false,
  isSyncingInOtherTab: false,
};

describe("isSyncToggleDisabled", () => {
  test("should be enabled when the node is ready and nothing blocks it", () => {
    expect(isSyncToggleDisabled(enabled)).toBe(false);
  });

  test.each<NodeStatus>([
    "CONNECTING",
    "INVALID_URL",
    "INVALID_PROTOCOL",
    "NETWORK_ERROR",
    "WRONG_CHAIN",
    undefined,
  ])("should be disabled when the node status is %j", (nodeStatus) => {
    expect(isSyncToggleDisabled({ ...enabled, nodeStatus })).toBe(true);
  });

  test("should be disabled when the chain is not a sync target", () => {
    expect(isSyncToggleDisabled({ ...enabled, isSyncTarget: false })).toBe(
      true,
    );
  });

  test.each<[SyncStateText, boolean]>([
    ["stopped", false],
    ["syncing", false],
    ["stopping", true],
    ["-", false],
  ])(
    "should judge the sync state %j as disabled: %j",
    (syncStateText, disabled) => {
      expect(isSyncToggleDisabled({ ...enabled, syncStateText })).toBe(
        disabled,
      );
    },
  );

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
        isSyncToggleDisabled({ ...enabled, isToggleOn: true, nodeStatus }),
      ).toBe(false);
    },
  );

  test("should be enabled to stop the sync when the chain is not a sync target", () => {
    expect(
      isSyncToggleDisabled({
        ...enabled,
        isToggleOn: true,
        isSyncTarget: false,
      }),
    ).toBe(false);
  });

  test.each<keyof SyncToggleConditions>(["isStarting", "isSyncingInOtherTab"])(
    "should be disabled when on and %s",
    (key) => {
      expect(
        isSyncToggleDisabled({ ...enabled, isToggleOn: true, [key]: true }),
      ).toBe(true);
    },
  );

  test("should be disabled when on and stopping", () => {
    expect(
      isSyncToggleDisabled({
        ...enabled,
        isToggleOn: true,
        syncStateText: "stopping",
      }),
    ).toBe(true);
  });

  test("should be disabled while starting", () => {
    expect(isSyncToggleDisabled({ ...enabled, isStarting: true })).toBe(true);
  });

  test("should be disabled while syncing in another tab", () => {
    expect(
      isSyncToggleDisabled({ ...enabled, isSyncingInOtherTab: true }),
    ).toBe(true);
  });
});
