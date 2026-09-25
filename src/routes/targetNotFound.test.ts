import { describe, expect, test } from "vitest";
import { isHttpError } from "@sveltejs/kit";
import { TargetNotFoundError } from "@utils/utilsDb";
import { throwNotFoundAs404 } from "./targetNotFound";

function catchError(call: () => unknown): unknown {
  try {
    call();
  } catch (e) {
    return e;
  }
  throw new Error("expected an error to be thrown");
}

describe("throwNotFoundAs404", () => {
  test("should return the value of the callback", () => {
    expect(throwNotFoundAs404(() => "value")).toBe("value");
  });
  test("should turn TargetNotFoundError into a 404 error", () => {
    const actual = catchError(() =>
      throwNotFoundAs404(() => {
        throw new TargetNotFoundError("chain", { chainName: "foo" });
      }),
    );
    expect(isHttpError(actual, 404)).toBe(true);
    expect(isHttpError(actual) && actual.body.message).toBe(
      "chain not found: foo",
    );
  });
  test("should rethrow other errors as they are", () => {
    const otherError = new Error("other");
    const actual = catchError(() =>
      throwNotFoundAs404(() => {
        throw otherError;
      }),
    );
    expect(actual).toBe(otherError);
  });
});
