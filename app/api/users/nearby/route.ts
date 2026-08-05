import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';
import { queryOne, query } from '@/lib/db';
import { buildNearbyUsersQuery, parseCoordinates } from '@/lib/geospatial';
import { parseNearbyDistanceMiles, milesToKilometers } from '@/lib/nearby';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const radiusMiles = parseNearbyDistanceMiles(searchParams.get('radius'));
    const radiusKm = milesToKilometers(radiusMiles);

    const currentUser = await queryOne(
      'SELECT latitude, longitude, share_location FROM users WHERE id = $1',
      [payload.id]
    );

    if (!currentUser) {
      return errorResponse('User not found', 404);
    }

    const coords = parseCoordinates(currentUser.latitude, currentUser.longitude);
    if (!coords) {
      return errorResponse('Your location is not set. Enable location sharing first.', 422);
    }

    const { text, params } = buildNearbyUsersQuery(
      payload.id,
      radiusKm,
      coords.latitude,
      coords.longitude
    );

    const users = await query(text, params);

    return successResponse({ users, radiusMiles });
  } catch (error) {
    return handleApiError(error, 'Nearby users error');
  }
}
