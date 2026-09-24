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
        if (
          Array.isArray(convertedEventLog.args[indexOfInput]) &&
          convertedEventLog.args[indexOfInput].length > maxLength
        ) {
          maxLength = convertedEventLog.args[indexOfInput].length;
        } else {
          maxLength = 1;
        }
      }
      maxLengths.push(maxLength);
    }
  }
  return maxLengths;
}
