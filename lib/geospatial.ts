export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;
const KM_PER_LATITUDE_DEGREE = 110.574;
const KM_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111.32;

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLngRad = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function parseCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

export function buildNearbyUsersQuery(limit: number) {
  return `
    WITH nearby_users AS (
      SELECT u.id,
             u.first_name,
             u.age,
             u.city,
             u.latitude,
             u.longitude,
             earth_distance(ll_to_earth($1, $2), ll_to_earth(u.latitude, u.longitude)) AS distance_meters
      FROM users u
      WHERE u.id != $3
        AND u.share_location = TRUE
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND earth_box(ll_to_earth($1, $2), $4) @> ll_to_earth(u.latitude, u.longitude)
        AND earth_distance(ll_to_earth($1, $2), ll_to_earth(u.latitude, u.longitude)) <= $4
    ),
    latest_moods AS (
      SELECT DISTINCT ON (m.user_id)
             m.id,
             m.user_id,
             m.text,
             m.vibe,
             m.tags,
             m.reactions,
             m.boosted,
             m.created_at,
             m.expires_at
      FROM moods m
      WHERE m.expires_at > NOW()
        AND m.flagged = FALSE
      ORDER BY m.user_id, m.expires_at DESC, m.created_at DESC
    )
    SELECT lm.id,
           lm.user_id,
           lm.text,
           lm.vibe,
           lm.tags,
           lm.reactions,
           lm.boosted,
           lm.created_at,
           lm.expires_at,
           nu.first_name,
           nu.age,
           nu.city,
           ROUND((nu.distance_meters / 1000)::numeric, 1) AS distance_km,
           ROUND((((nu.longitude - $2) * $5 * COS(RADIANS(($1 + nu.latitude) / 2.0))))::numeric, 2) AS relative_x,
           ROUND((((nu.latitude - $1) * $6))::numeric, 2) AS relative_y
    FROM nearby_users nu
    JOIN latest_moods lm ON lm.user_id = nu.id
    ORDER BY nu.distance_meters ASC, lm.boosted DESC, lm.created_at DESC
    LIMIT ${limit}
  `;
}

export function getLongitudeScale(latitude: number) {
  return Math.max(
    Math.cos((latitude * Math.PI) / 180) * KM_PER_LONGITUDE_DEGREE_AT_EQUATOR,
    0.1
  );
}

export { KM_PER_LATITUDE_DEGREE, KM_PER_LONGITUDE_DEGREE_AT_EQUATOR };
