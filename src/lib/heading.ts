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

// Heading of the device's top edge projected onto the horizontal plane.
// Near vertical, that projection vanishes and cannot give a useful bearing.
export function getAbsoluteHeading(alpha: number, beta: number): number | null {
  if (!Number.isFinite(alpha) || !Number.isFinite(beta)) return null;
  const topProjection = Math.cos((beta * Math.PI) / 180);
  if (Math.abs(topProjection) < 0.01) return null;
  return normalizeHeading(360 - alpha + (topProjection < 0 ? 180 : 0));
}

export function getCompassDirection(heading: number): CompassDirection {
  const directionIndex = Math.round(normalizeHeading(heading) / 45) % 8;
  return COMPASS_DIRECTIONS[directionIndex];
}
