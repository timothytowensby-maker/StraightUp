import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const { vibeId } = body;

    if (!vibeId || typeof vibeId !== 'string') {
      return errorResponse('vibeId is required', 400);
    }

    const mood = await queryOne(
      `UPDATE moods
       SET boosted = TRUE
       WHERE id = $1 AND user_id = $2 AND expires_at > NOW()
       RETURNING *`,
      [vibeId, payload.id]
    );

    if (!mood) {
      return errorResponse('Mood not found, expired, or unavailable for boosting', 404);
    }

    return successResponse({ success: true, mood });
  } catch (error: unknown) {
    return handleApiError(error, 'Boost mood error');
  }
}
