import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateRequest, successResponse, errorResponse, handleApiError } from '@/lib/utils';
import { classifyMood, moderateContent } from '@/lib/ai';
import { v4 as uuid } from 'uuid';
import { addHours } from 'date-fns';

// WGS84 mean Earth radius used for spherical distance calculations.
const EARTH_RADIUS_KM = 6371;
// Approximate kilometers per degree of latitude.
const KM_PER_LATITUDE_DEGREE = 110.574;
// Approximate kilometers per degree of longitude at the equator before latitude scaling is applied.
const KM_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111.32;

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const { text } = body;

    // Validation
    if (!text || typeof text !== 'string') {
      return errorResponse('Mood text is required', 400);
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0 || trimmedText.length > 180) {
      return errorResponse('Mood must be between 1 and 180 characters', 400);
    }

    // Moderate content
    const moderation = await moderateContent(trimmedText);
    if (!moderation.safe) {
      return errorResponse(`Content violates guidelines: ${moderation.reason}`, 400);
    }

    // Classify vibe
    const vibe = await classifyMood(trimmedText);

    // Extract tags (words starting with #)
    const tags = (trimmedText.match(/#\w+/g) || []).map((tag) => tag.slice(1));

    // Create mood
    const moodId = uuid();
    const expiresAt = addHours(new Date(), 24);

    await query(
      `INSERT INTO moods (id, user_id, text, vibe, tags, created_at, expires_at, moderated)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
      [moodId, payload.id, trimmedText, vibe, tags, expiresAt, true]
    );

    const mood = await queryOne('SELECT * FROM moods WHERE id = $1', [moodId]);
    return successResponse(mood, 201);
  } catch (error: any) {
    return handleApiError(error, 'Post mood error');
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const city = searchParams.get('city');
    const nearby = searchParams.get('nearby') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const radiusKm = Math.min(Math.max(parseInt(searchParams.get('radius_km') || '25'), 1), 100);

    let moods;
    if (nearby) {
      const latitude = parseFloat(searchParams.get('latitude') || '');
      const longitude = parseFloat(searchParams.get('longitude') || '');

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return errorResponse('Valid latitude and longitude are required for nearby mode', 400);
      }

      const latitudeDelta = radiusKm / KM_PER_LATITUDE_DEGREE;
      const longitudeDelta =
        radiusKm /
        Math.max(
          Math.cos((latitude * Math.PI) / 180) * KM_PER_LONGITUDE_DEGREE_AT_EQUATOR,
          0.1
        );

      moods = await query(
        `SELECT m.id, m.user_id, m.text, m.vibe, m.tags, m.created_at, m.expires_at,
                u.first_name, u.age, u.city,
                ROUND(geo.distance_km::numeric, 1) AS distance_km,
                ROUND(geo.relative_x::numeric, 2) AS relative_x,
                ROUND(geo.relative_y::numeric, 2) AS relative_y
         FROM moods m
         JOIN users u ON m.user_id = u.id
         CROSS JOIN LATERAL (
           SELECT
                  -- Great-circle distance between the viewer and the mood owner in kilometers.
                  $8 * ACOS(
                    LEAST(
                      1,
                      GREATEST(
                        -1,
                        COS(RADIANS($1)) * COS(RADIANS(u.latitude)) * COS(RADIANS(u.longitude) - RADIANS($2)) +
                        SIN(RADIANS($1)) * SIN(RADIANS(u.latitude))
                      )
                    )
                  ) AS distance_km,
                  -- Approximate east/west offset in kilometers for plotting nearby markers on the map card.
                  ((u.longitude - $2) * $9 * COS(RADIANS(($1 + u.latitude) / 2.0))) AS relative_x,
                  -- Approximate north/south offset in kilometers for plotting nearby markers on the map card.
                  ((u.latitude - $1) * $10) AS relative_y
         ) geo
         WHERE m.expires_at > NOW()
           AND m.flagged = FALSE
           AND m.user_id != $3
           AND u.share_location = TRUE
           AND u.latitude IS NOT NULL
           AND u.longitude IS NOT NULL
           AND u.latitude BETWEEN $1 - $4 AND $1 + $4
           AND u.longitude BETWEEN $2 - $5 AND $2 + $5
           AND geo.distance_km <= $6
         ORDER BY geo.distance_km ASC, m.created_at DESC
         LIMIT $7`,
        [
          latitude,
          longitude,
          payload.id,
          latitudeDelta,
          longitudeDelta,
          radiusKm,
          limit,
          EARTH_RADIUS_KM,
          KM_PER_LONGITUDE_DEGREE_AT_EQUATOR,
          KM_PER_LATITUDE_DEGREE,
        ]
      );
    } else if (city) {
      moods = await query(
        `SELECT m.id, m.user_id, m.text, m.vibe, m.tags, m.created_at, m.expires_at,
                u.first_name, u.age, u.city
         FROM moods m
         JOIN users u ON m.user_id = u.id
         WHERE u.city = $1 AND m.expires_at > NOW() AND m.flagged = FALSE
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [city, limit]
      );
    } else {
      moods = await query(
        `SELECT m.id, m.user_id, m.text, m.vibe, m.tags, m.created_at, m.expires_at,
                u.first_name, u.age, u.city
         FROM moods m
         JOIN users u ON m.user_id = u.id
         WHERE m.expires_at > NOW() AND m.flagged = FALSE AND m.user_id != $1
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [payload.id, limit]
      );
    }

    return successResponse({ moods, count: moods.length });
  } catch (error: any) {
    return handleApiError(error, 'Get moods error');
  }
}
