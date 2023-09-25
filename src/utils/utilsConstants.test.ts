import { describe, expect, test } from "vitest";
import { NO_DATA } from "./utilsCostants";
describe("NO_DATA", () => {
  test('should be equal to "-"', () => {
    expect(NO_DATA).toEqual("-");
  });
});
