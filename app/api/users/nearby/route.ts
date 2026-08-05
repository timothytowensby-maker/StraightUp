import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';

const EARTH_RADIUS_METERS = 6371 * 1000;
const KM_PER_LATITUDE_DEGREE = 110.574;
const KM_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111.32;

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const radiusKm = Math.min(parseFloat(searchParams.get('radius_km') || '25'), 100);

    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      return errorResponse('radius_km must be a positive number (max 100)', 400);
    }

    // Get the current user's location
    const currentUser = await queryOne(
      'SELECT latitude, longitude FROM users WHERE id = $1',
      [payload.id]
    );

    if (!currentUser || currentUser.latitude == null || currentUser.longitude == null) {
      return errorResponse('Your location is not set. Please update your location first.', 400);
    }

    const { latitude, longitude } = currentUser;
    const maxDistanceMeters = radiusKm * 1000;
    const latitudeDelta = radiusKm / KM_PER_LATITUDE_DEGREE;
    const longitudeDelta =
      radiusKm /
      Math.max(
        Math.cos((latitude * Math.PI) / 180) * KM_PER_LONGITUDE_DEGREE_AT_EQUATOR,
        0.1
      );

    const users = await query(
      `SELECT
         u.id,
         u.first_name,
         u.age,
         u.city,
         u.energy_traits,
         u.latitude,
         u.longitude,
         ROUND((geo.distance_meters / 1000)::numeric, 1) AS distance_km,
         m.id AS mood_id,
         m.text AS mood_text,
         m.vibe,
         m.created_at AS mood_created_at
       FROM users u
       CROSS JOIN LATERAL (
         SELECT
           $7 * ACOS(
             LEAST(
               1,
               GREATEST(
                 -1,
                 COS(RADIANS($1)) * COS(RADIANS(u.latitude)) * COS(RADIANS(u.longitude) - RADIANS($2)) +
                 SIN(RADIANS($1)) * SIN(RADIANS(u.latitude))
               )
             )
           ) AS distance_meters
       ) geo
       LEFT JOIN LATERAL (
         SELECT id, text, vibe, created_at
         FROM moods
         WHERE user_id = u.id AND expires_at > NOW() AND flagged = FALSE
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON TRUE
       WHERE u.id != $3
         AND u.share_location = TRUE
         AND u.latitude IS NOT NULL
         AND u.longitude IS NOT NULL
         AND u.latitude BETWEEN $1 - $4 AND $1 + $4
         AND u.longitude BETWEEN $2 - $5 AND $2 + $5
         AND geo.distance_meters <= $6
       ORDER BY geo.distance_meters ASC
       LIMIT 100`,
      [
        latitude,
        longitude,
        payload.id,
        latitudeDelta,
        longitudeDelta,
        maxDistanceMeters,
        EARTH_RADIUS_METERS,
      ]
    );

    return successResponse({ users, count: users.length });
  } catch (error) {
    return handleApiError(error, 'Get nearby users error');
  }
}
