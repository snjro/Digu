export function convertTimestampSecToIso8601(timestampSec?: number): string {
  let timestampMilliSec: number | undefined = undefined;
  let date: Date | undefined = undefined;
  if (timestampSec) {
    timestampMilliSec = timestampSec * 1000;
    date = new Date(timestampMilliSec);
  } else {
    date = new Date();
  }
  return convertJsDateToIso8601(date);
}
export function convertJsDateToTimestampSec(jsDate: Date): number {
  return jsDate.getTime() / 1000;
}
export function convertJsDateToIso8601(jsDate: Date): string {
  return jsDate.toISOString().split(".")[0] + "Z";
}
