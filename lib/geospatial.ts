export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Client-side Haversine formula to calculate great-circle distance between two points.
 * Returns distance in kilometres.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate and parse latitude/longitude values.
 * Returns null if either coordinate is out of range.
 */
export function parseCoordinates(
  lat: unknown,
  lng: unknown
): Coordinates | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

/**
 * Build an optimized SQL query for finding nearby users using PostgreSQL
 * earthdistance GiST index.  Returns the query string and its parameter array.
 *
 * Result columns: id, first_name, age, city, latitude, longitude,
 *   distance_km, mood_text, mood_vibe, mood_id
 */
export function buildNearbyUsersQuery(
  userId: string,
  radiusKm: number,
  userLat: number,
  userLng: number,
  limit = 100
): { text: string; params: (string | number)[] } {
  const text = `
    SELECT DISTINCT ON (u.id)
      u.id,
      u.first_name,
      u.age,
      u.city,
      u.latitude,
      u.longitude,
      earth_distance(
        ll_to_earth($2, $3),
        ll_to_earth(u.latitude, u.longitude)
      ) / 1000.0 AS distance_km,
      m.id        AS mood_id,
      m.text      AS mood_text,
      m.vibe      AS mood_vibe,
      m.expires_at AS mood_expires_at
    FROM users u
    LEFT JOIN LATERAL (
      SELECT id, text, vibe, expires_at
      FROM moods
      WHERE user_id = u.id
        AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1
    ) m ON TRUE
    WHERE u.id <> $1
      AND u.share_location = TRUE
      AND u.latitude  IS NOT NULL
      AND u.longitude IS NOT NULL
      AND earth_box(ll_to_earth($2, $3), $4 * 1000) @> ll_to_earth(u.latitude, u.longitude)
      AND earth_distance(
            ll_to_earth($2, $3),
            ll_to_earth(u.latitude, u.longitude)
          ) <= $4 * 1000
    ORDER BY u.id, distance_km ASC
    LIMIT $5
  `;
  return {
    text,
    params: [userId, userLat, userLng, radiusKm, limit],
  };
}
