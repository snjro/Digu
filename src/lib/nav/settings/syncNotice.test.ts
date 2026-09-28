import { describe, expect, test } from "vitest";
import { NO_DATA } from "@utils/utilsConstants";
import { getSyncNoticeText } from "./syncNotice";

describe("getSyncNoticeText", () => {
  test("says why the settings cannot be changed while syncing and stopping", () => {
    expect(getSyncNoticeText("syncing")).toBe(
      "Syncing. Stop the sync to change these settings.",
    );
    expect(getSyncNoticeText("stopping")).toBe(
      "Stopping the sync… The settings can be changed once it stops.",
    );
  });

  test("says nothing when the chain is not synced", () => {
    expect(getSyncNoticeText("stopped")).toBeUndefined();
    expect(getSyncNoticeText(NO_DATA)).toBeUndefined();
  });
});
