export type CompassDirection =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW";

const COMPASS_DIRECTIONS: CompassDirection[] = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
];

export function normalizeHeading(heading: number): number {
  return ((heading % 360) + 360) % 360;
}

export function getCompassDirection(heading: number): CompassDirection {
  const directionIndex = Math.round(normalizeHeading(heading) / 45) % 8;
  return COMPASS_DIRECTIONS[directionIndex];
}
