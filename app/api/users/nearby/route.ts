import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest, successResponse, errorResponse, handleApiError } from '@/lib/utils';

// WGS84 mean Earth radius used for spherical distance calculations.
const EARTH_RADIUS_KM = 6371;
// Approximate kilometers per degree of latitude.
const KM_PER_LATITUDE_DEGREE = 110.574;
// Approximate kilometers per degree of longitude at the equator before latitude scaling is applied.
const KM_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111.32;

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 100;
const RESULTS_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;

    const rawRadius = parseFloat(searchParams.get('radius_km') || String(DEFAULT_RADIUS_KM));
    const radiusKm = Math.min(
      Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : DEFAULT_RADIUS_KM,
      MAX_RADIUS_KM
    );

    // Get the current user's location
    const userRows = await query(
      'SELECT latitude, longitude FROM users WHERE id = $1',
      [payload.id]
    );
    const currentUser = userRows[0];

    if (!currentUser || currentUser.latitude == null || currentUser.longitude == null) {
      return errorResponse('Your location is not set. Update your location first.', 400);
    }

    const { latitude, longitude } = currentUser;

    // Bounding-box pre-filter to avoid a full-table scan, then apply Haversine.
    const latitudeDelta = radiusKm / KM_PER_LATITUDE_DEGREE;
    const longitudeDelta =
      radiusKm / (KM_PER_LONGITUDE_DEGREE_AT_EQUATOR * Math.cos((latitude * Math.PI) / 180));
    const maxDistanceMeters = radiusKm * 1000;

    const nearbyUsers = await query(
      `SELECT
         geo.user_id,
         geo.first_name,
         geo.age,
         geo.city,
         geo.energy_traits,
         geo.latitude,
         geo.longitude,
         geo.distance_meters,
         geo.distance_meters / 1000.0 AS distance_km,
         geo.vibe,
         geo.mood_text,
         geo.mood_created_at,
         geo.mood_id
       FROM (
         SELECT
           u.id AS user_id,
           u.first_name,
           u.age,
           u.city,
           u.energy_traits,
           u.latitude,
           u.longitude,
           latest.vibe,
           latest.text AS mood_text,
           latest.created_at AS mood_created_at,
           latest.id AS mood_id,
           $8 * 2 * ASIN(
             SQRT(
               POWER(SIN(($1 - u.latitude) * PI() / 180 / 2), 2) +
               COS($1 * PI() / 180) * COS(u.latitude * PI() / 180) *
               POWER(SIN(($2 - u.longitude) * PI() / 180 / 2), 2)
             )
           ) * 1000 AS distance_meters
         FROM users u
         LEFT JOIN LATERAL (
           SELECT id, text, vibe, created_at
           FROM moods
           WHERE user_id = u.id AND expires_at > NOW()
           ORDER BY created_at DESC
           LIMIT 1
         ) latest ON TRUE
         WHERE u.id != $3
           AND u.share_location = TRUE
           AND u.latitude IS NOT NULL
           AND u.longitude IS NOT NULL
           AND u.latitude  BETWEEN $1 - $4 AND $1 + $4
           AND u.longitude BETWEEN $2 - $5 AND $2 + $5
       ) geo
       WHERE geo.distance_meters <= $6
       ORDER BY geo.distance_meters ASC
       LIMIT $7`,
      [
        latitude,
        longitude,
        payload.id,
        latitudeDelta,
        longitudeDelta,
        maxDistanceMeters,
        RESULTS_LIMIT,
        EARTH_RADIUS_KM,
      ]
    );

    return successResponse({ users: nearbyUsers, count: nearbyUsers.length, radius_km: radiusKm });
  } catch (error) {
    return handleApiError(error, 'Get nearby users error');
  }
}
