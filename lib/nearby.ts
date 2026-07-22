export const METERS_PER_MILE = 1609.34;
const KILOMETERS_PER_MILE = METERS_PER_MILE / 1000;
const DISTANCE_MATCH_EPSILON = 0.01;

export const ALLOWED_NEARBY_DISTANCE_MILES = [5, 10, 25] as const;
export const DEFAULT_NEARBY_DISTANCE_MILES = 10;

export type NearbyDistanceMiles = (typeof ALLOWED_NEARBY_DISTANCE_MILES)[number];

export function milesToMeters(distanceMiles: number) {
  return distanceMiles * METERS_PER_MILE;
}

export function milesToKilometers(distanceMiles: number) {
  return distanceMiles * KILOMETERS_PER_MILE;
}

export function kilometersToMiles(distanceKilometers: number) {
  return distanceKilometers / KILOMETERS_PER_MILE;
}

export function isNearbyDistanceMiles(value: number): value is NearbyDistanceMiles {
  return ALLOWED_NEARBY_DISTANCE_MILES.includes(value as NearbyDistanceMiles);
}

export function normalizeNearbyDistanceMiles(value: number) {
  return isNearbyDistanceMiles(value) ? value : DEFAULT_NEARBY_DISTANCE_MILES;
}

export function parseNearbyDistanceMiles(value: string | null) {
  if (!value) {
    return DEFAULT_NEARBY_DISTANCE_MILES;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_NEARBY_DISTANCE_MILES;
  }

  if (isNearbyDistanceMiles(numericValue)) {
    return numericValue;
  }

  // When the request sends meters instead of miles, map only the exact supported meter values back to
  // their matching mile options so the server does not accept arbitrary radii.
  const matchedDistance = ALLOWED_NEARBY_DISTANCE_MILES.find(
    (distanceMiles) => Math.abs(numericValue - milesToMeters(distanceMiles)) <= DISTANCE_MATCH_EPSILON
  );

  return matchedDistance ?? DEFAULT_NEARBY_DISTANCE_MILES;
}
