export const METERS_PER_MILE = 1609.34;
const KILOMETERS_PER_MILE = METERS_PER_MILE / 1000;
const DISTANCE_MATCH_EPSILON_METERS = 1;

export const ALLOWED_NEARBY_DISTANCE_MILES = [5, 10, 25] as const;
export const DEFAULT_NEARBY_DISTANCE_MILES = 10;

export type NearbyDistanceMiles = (typeof ALLOWED_NEARBY_DISTANCE_MILES)[number];

export function milesToMeters(distanceMiles: number) {
  return distanceMiles * METERS_PER_MILE;
}

export function milesToQueryMeters(distanceMiles: number) {
  return Math.round(milesToMeters(distanceMiles));
}

export function milesToKilometers(distanceMiles: number) {
  return distanceMiles * KILOMETERS_PER_MILE;
}

export function kilometersToMiles(distanceKilometers: number) {
  return distanceKilometers / KILOMETERS_PER_MILE;
}

export function formatDistanceMilesFromKilometers(distanceKilometers: number | null | undefined) {
  if (distanceKilometers == null) {
    return null;
  }

  return `${kilometersToMiles(distanceKilometers).toFixed(1)} miles away`;
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

  // When the request sends rounded meters instead of miles, map only the supported rounded meter
  // values back to their matching mile options so the server does not accept arbitrary radii.
  const matchedDistance = ALLOWED_NEARBY_DISTANCE_MILES.find(
    (distanceMiles) =>
      Math.abs(numericValue - milesToQueryMeters(distanceMiles)) <= DISTANCE_MATCH_EPSILON_METERS
  );

  return matchedDistance ?? DEFAULT_NEARBY_DISTANCE_MILES;
}
