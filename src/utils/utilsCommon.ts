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

export function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error("Promise timed out"),
): Promise<T> {
  // create a promise that rejects in milliseconds
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });

  // returns a race between timeout and the passed promise
  return Promise.race<T>([promise, timeout]);
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

export function jsonStringifyFormatted(value: any): string {
  if (typeof value === "string") {
    value = JSON.parse(value);
  }
  return JSON.stringify(value, null, 2);
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
