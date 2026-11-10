import { describe, expectTypeOf, test } from "vitest";
import type { KeysMatching } from "./utilsType";
type TestType = {
  a: number;
  b: string;
  c: boolean;
};

describe("KeysMatching", () => {
  // Checked by the type checker, not at run time.
  test("should return only the keys of matching types", () => {
    expectTypeOf<KeysMatching<TestType, number>>().toEqualTypeOf<"a">();
    expectTypeOf<KeysMatching<TestType, string | boolean>>().toEqualTypeOf<
      "b" | "c"
    >();
  });
});
