import { describe, expect, test } from "vitest";
import {
  assertIsDefined,
  capitalizeFirstLetter,
  convertToKebabCase,
  getUrlObject,
  jsonStringifyFormatted,
  numberWithCommas,
  removeDuplicateValuesFromArray,
  sleep,
  sortArray,
  sortObjectArrayByProperty,
} from "./utilsCommon";

describe("assertIsDefined", () => {
  test("should throw an error if the value is undefined", () => {
    expect(() => assertIsDefined(undefined)).toThrow();
  });
  test("should throw an error if the value is null", () => {
    expect(() => assertIsDefined(null)).toThrow();
  });
  test("should NOT throw an error if the value is string-empty", () => {
    expect(() => assertIsDefined("")).not.toThrow();
  });
  test("should NOT throw an error if the value is string", () => {
    expect(() => assertIsDefined("hoge")).not.toThrow();
  });
});
describe("removeDuplicateValuesFromArray", () => {
  test("should remove duplicate values from an array", () => {
    const array: number[] = [1, 2, 2, 3, 3, 3];
    const result = removeDuplicateValuesFromArray(array);
    expect(result).toEqual([1, 2, 3]);
  });
});
describe("getUrlObject", () => {
  test("should return a URL object if the string is a valid URL", () => {
    expect(getUrlObject("https://example.com")).toBeInstanceOf(URL);
  });
  test("should return undefined if the string is invalid", () => {
    expect(getUrlObject("invalid")).toBeUndefined();
  });
});
describe("numberWithCommas", () => {
  test("should format a number with commas as thousands separators and dot as decimal point", () => {
    expect(numberWithCommas(1234567.89)).toBe("1,234,567.89");
  });
  test("should format a number with commasas thousands separators", () => {
    expect(numberWithCommas(1234567)).toBe("1,234,567");
  });
});

describe("jsonStringifyFormatted", () => {
  test("should return a JSON string with indentation", () => {
    const object = { a: 1, b: [2, 3], c: { d: 4 } };
    const jsonString = jsonStringifyFormatted(object);
    expect(jsonString).toBe(
      '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ],\n  "c": {\n    "d": 4\n  }\n}',
    );
  });
});
describe("sortArray", () => {
  test("should sort an array in ascending order with the same values", () => {
    const array1 = [3, 3, 2];
    expect(sortArray(array1, "asc")).toEqual([2, 3, 3]);
  });
  test("should sort an array in ascending order", () => {
    const array2 = [3, 1, 2];
    expect(sortArray(array2, "asc")).toEqual([1, 2, 3]);
  });
  test("should sort an array in descending order with the same values", () => {
    const array3 = [3, 3, 2];
    expect(sortArray(array3, "desc")).toEqual([3, 3, 2]);
  });
  test("should sort an array in descending order", () => {
    const array4 = [3, 1, 2];
    expect(sortArray(array4, "desc")).toEqual([3, 2, 1]);
  });
});
describe("sortObjectArrayByProperty", () => {
  test("should sort an array of objects by a number property in ascending order", () => {
    const array1 = [{ a: 3 }, { a: 3 }, { a: 2 }];
    expect(sortObjectArrayByProperty(array1, "a", "asc")).toEqual([
      { a: 2 },
      { a: 3 },
      { a: 3 },
    ]);
  });
  test("should sort an array of objects by a string property in ascending order", () => {
    const array2 = [{ a: "c" }, { a: "a" }, { a: "b" }];
    expect(sortObjectArrayByProperty(array2, "a", "asc")).toEqual([
      { a: "a" },
      { a: "b" },
      { a: "c" },
    ]);
  });
  test("should sort an array of objects by a number property in descending order", () => {
    const array3 = [{ a: 3 }, { a: 3 }, { a: 2 }];
    expect(sortObjectArrayByProperty(array3, "a", "desc")).toEqual([
      { a: 3 },
      { a: 3 },
      { a: 2 },
    ]);
  });
  test("should sort an array of objects by a string property in descending order", () => {
    const array4 = [{ a: "c" }, { a: "a" }, { a: "b" }];
    expect(sortObjectArrayByProperty(array4, "a", "desc")).toEqual([
      { a: "c" },
      { a: "b" },
      { a: "a" },
    ]);
  });
});
describe("capitalizeFirstLetter", () => {
  test("should not change anything that is empty string", () => {
    const targetString1 = "";
    expect(capitalizeFirstLetter(targetString1)).toBe("");
  });
  test("should capitalize the first letter of a string", () => {
    const targetString2 = "hello";
    expect(capitalizeFirstLetter(targetString2)).toBe("Hello");
  });
  test("should not change anything the first letter is a string", () => {
    const targetString3 = "3hello";
    expect(capitalizeFirstLetter(targetString3)).toBe("3hello");
  });
});
describe("convertToKebabCase", () => {
  test("should convert a string to kebab case", () => {
    const string: string = "Hello World";
    const kebabCaseString: string = convertToKebabCase(string);
    expect(kebabCaseString).toBe("hello-world");
  });
});

describe("sleep", () => {
  test("should wait for the specified number of milliseconds", async (): Promise<void> => {
    const start: number = Date.now();
    const waitTime: number = 1000; // Wait for one second.
    await sleep(waitTime);
    const end: number = Date.now();
    const elapsedTime: number = end - start;
    expect(elapsedTime).toBeGreaterThanOrEqual(waitTime);
    expect(elapsedTime).toBeLessThan(waitTime + 100); // Allow for some leeway due to setTimeout's precision.
  });
});
