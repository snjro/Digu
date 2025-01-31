import { round } from "@utils/utilsMath";

export function getProgressRate(start: number, end: number, current: number) {
  const processedLength: number = current - start;
  const totalLength: number = end - start;
  const progressRate: number = round((processedLength * 100) / totalLength, 3);
  return isNaN(progressRate) || progressRate < 0 ? 0 : progressRate;
}

export function getProgressRateForLabel(progressRate: number): string {
  return progressRate >= 99.95
    ? progressRate.toFixed(0)
    : progressRate.toFixed(1);
}
