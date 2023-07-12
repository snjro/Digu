export function round(num: number, place: number): number {
  const power: number = 10 ** place;
  return Math.round(num * power) / power;
}
