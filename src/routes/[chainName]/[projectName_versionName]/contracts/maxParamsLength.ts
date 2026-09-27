import type { ConvertedEventLog } from "@db/dbTypes";

export function getMaxParamsLength<T>(
  rows: T[],
  getParams: (row: T) => readonly unknown[],
): number {
  let maxIndex: number = 0;
  rows.forEach((row: T) => {
    if (getParams(row).length > maxIndex) {
      maxIndex = getParams(row).length;
    }
  });
  return maxIndex;
}

export function getEachArgsMaxLengths(
  convertedEventLogs: ConvertedEventLog[] | undefined,
  numOfInputs: number,
): number[] {
  const maxLengths: number[] = [];
  if (convertedEventLogs) {
    for (
      let indexOfInput: number = 0;
      indexOfInput < numOfInputs;
      indexOfInput++
    ) {
      let maxLength: number = 0;
      for (const convertedEventLog of convertedEventLogs) {
        const arg: unknown = convertedEventLog.args[indexOfInput];
        if (Array.isArray(arg) && arg.length > maxLength) {
          maxLength = arg.length;
        } else {
          maxLength = Math.max(maxLength, 1);
        }
      }
      maxLengths.push(maxLength);
    }
  }
  return maxLengths;
}
