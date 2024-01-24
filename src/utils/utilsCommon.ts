export function assertIsDefined<T>(
  assertDefinedValue: T,
): asserts assertDefinedValue is NonNullable<T> {
  if (assertDefinedValue === undefined || assertDefinedValue === null) {
    const errorMessage: string = `Expected 'value' to be defined, but received value is: ${assertDefinedValue}`;
    throw new Error(errorMessage);
  }
}

export function removeDuplicateValuesFromArray<T>(array: T[]): T[] {
  const uniqueArray: T[] = [...new Set(array)];
  return uniqueArray;
}

export function getUrlObject(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch (e) {
    return undefined;
  }
}

export function numberWithCommas(n: number): string {
  const parts: string[] = n.toString().split(".");
  return (
    parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (parts[1] ? "." + parts[1] : "")
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export function jsonStringifyFormatted(
  value: any,
  numOfSpace: number = 2,
): string {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return JSON.stringify(value, null, numOfSpace);
}

type SortType = "asc" | "desc";
export function sortArray<T>(arr: Array<T>, sortType: SortType): Array<T> {
  return arr.sort((a, b) => {
    if (a < b) {
      return sortType === "asc" ? -1 : 1;
    }
    if (a > b) {
      return sortType === "asc" ? 1 : -1;
    }
    return 0;
  });
}

export function sortObjectArrayByProperty<T>(
  objectArray: T[],
  property: keyof T,
  sortType: "asc" | "desc" = "asc",
): T[] {
  return objectArray.sort((a, b) => {
    if (a[property] < b[property]) {
      return sortType === "asc" ? -1 : 1;
    }
    if (a[property] > b[property]) {
      return sortType === "asc" ? 1 : -1;
    }
    return 0;
  });
}

export function capitalizeFirstLetter(targetString: string): string {
  if (targetString.length === 0) {
    return targetString;
  }
  const firstChar = targetString.charAt(0);
  if (firstChar >= "a" && firstChar <= "z") {
    return firstChar.toUpperCase() + targetString.slice(1);
  }
  return targetString;
}

export function convertToKebabCase(targetString: string): string {
  return targetString
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise<void>(function (resolve: () => void): NodeJS.Timeout {
    return setTimeout(resolve, ms);
  });
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export function areValuesEqual(target1: any, target2: any): boolean {
  // For primitive types, simply compare
  if (target1 === target2) return true;

  // For Date objects
  if (target1 instanceof Date && target2 instanceof Date)
    return target1.getTime() === target2.getTime();

  // For arrays
  if (Array.isArray(target1) && Array.isArray(target2)) {
    // If the lengths of the arrays are different, return false
    if (target1.length !== target2.length) return false;

    // Recursively compare each element
    for (let i = 0; i < target1.length; i++) {
      if (!areValuesEqual(target1[i], target2[i])) return false;
    }

    // If all elements are equal, return true
    return true;
  }

  // For functions
  if (typeof target1 === "function" && typeof target2 === "function")
    return target1.toString() === target2.toString();

  // For object types
  if (typeof target1 === "object" && typeof target2 === "object") {
    // If the number of keys is different, return false
    if (Object.keys(target1).length !== Object.keys(target2).length)
      return false;

    // Recursively compare the value of each key
    for (const key in target1) {
      if (!areValuesEqual(target1[key], target2[key])) return false;
    }

    // If all keys' values are equal, return true
    return true;
  }

  // For all other cases, return false
  return false;
}
