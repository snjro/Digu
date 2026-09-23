import { describe, expect, test, vi } from "vitest";
import {
  convertJsDateToIso8601,
  convertJsDateToTimestampSec,
  convertTimestampSecToIso8601,
} from "./utilsTime";
test("convertTimestampSecToIso8601", () => {
  const timestampSec = 1640995200; // 2022-01-01T00:00:00Z
  const result = convertTimestampSecToIso8601(timestampSec);
  expect(result).toBe("2022-01-01T00:00:00Z");

  // Test when timestampSec is not provided: the current time is used
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2023-04-05T06:07:08.999Z"));
  try {
    expect(convertTimestampSecToIso8601()).toBe("2023-04-05T06:07:08Z");
  } finally {
    vi.useRealTimers();
  }
});

describe("convertJsDateToTimestampSec", () => {
  test("should convert Javascript Datetime to Timestamp", () => {
    const date = new Date("2022-01-01T00:00:00Z");
    const result = convertJsDateToTimestampSec(date);
    expect(result).toBe(1640995200);
  });
});

describe("convertJsDateToIso8601", () => {
  test("should convert Javascript Datetime to the format ISO-8601", () => {
    const date = new Date("2022-01-01T00:00:00Z");
    const result = convertJsDateToIso8601(date);
    expect(result).toBe("2022-01-01T00:00:00Z");
  });
});
