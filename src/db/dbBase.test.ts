import { describe, expect, test } from "vitest";
import { dbBase } from "./dbBase"; // ファイル名を適切なものに変更してください
import type { SchemaDefinition } from "./dbTypes";
import { DB_NAME } from "./constants";

class TestDb extends dbBase {
  getSchemaDefinition(): SchemaDefinition {
    return { testKey: "a" };
  }
  async addInitialData(): Promise<void> {
    console.log("executed getSchemaDefinition()");
  }
}
describe("dbBase", () => {
  test("should correctly construct the database name", () => {
    const dbNameElement = "test";
    const instance = new TestDb(dbNameElement);
    expect(instance.name).toBe(`${DB_NAME.firstName}_${dbNameElement}`);
  });
  test("should correctly construct the database name for an array input", () => {
    const dbNameElement = ["test1", "test2"];
    const instance = new TestDb(dbNameElement);
    expect(instance.name).toBe(
      `${DB_NAME.firstName}_${dbNameElement[0]}_${dbNameElement[1]}`,
    );
  });
});
