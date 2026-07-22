import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';
import { query, queryOne } from '@/lib/db';

function isValidCoordinate(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export async function PUT(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const { latitude, longitude, share_location } = body;

    if (typeof share_location !== 'boolean') {
      return errorResponse('share_location must be a boolean', 400);
    }

    const currentUser = await queryOne(
      'SELECT location_updated_at FROM users WHERE id = $1',
      [payload.id]
    );

    if (!currentUser) {
      return errorResponse('User not found', 404);
    }

    if (currentUser.location_updated_at) {
      const lastUpdatedAt = new Date(currentUser.location_updated_at).getTime();
      if (Date.now() - lastUpdatedAt < 15000) {
        return errorResponse('Location updates are limited to once every 15 seconds', 429);
      }
    }

    if (!share_location) {
      await query(
        `UPDATE users
         SET share_location = FALSE, location_updated_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [payload.id]
      );

      return successResponse({
        share_location: false,
        location_updated_at: new Date().toISOString(),
      });
    }

    if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
      return errorResponse('Valid latitude and longitude are required when sharing location', 400);
    }

    await query(
      `UPDATE users
       SET latitude = $1,
           longitude = $2,
           share_location = TRUE,
           location_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [latitude, longitude, payload.id]
    );

    return successResponse({
      share_location: true,
      location_updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, 'Update location error');
  }
}
