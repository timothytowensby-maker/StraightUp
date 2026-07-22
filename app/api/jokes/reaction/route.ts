import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query } from '@/lib/db';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const { joke_external_id, category, reaction } = body || {};

    if (!joke_external_id || !category || !['like', 'dislike'].includes(reaction)) {
      return errorResponse('joke_external_id, category and valid reaction are required', 400);
    }

    await query(
      `DELETE FROM joke_reactions
       WHERE user_id = $1
         AND joke_external_id = $2
         AND reaction IN ('like', 'dislike')`,
      [payload.id, joke_external_id]
    );

    await query(
      `INSERT INTO joke_reactions (id, user_id, joke_external_id, category, reaction)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuid(), payload.id, joke_external_id, category, reaction]
    );

    if (reaction === 'like') {
      await query(
        `INSERT INTO user_joke_preferences (user_id, category)
         VALUES ($1, $2)
         ON CONFLICT (user_id, category) DO NOTHING`,
        [payload.id, category]
      );
    }

    return successResponse({ message: 'Reaction saved' }, 201);
  } catch (error: unknown) {
    return handleApiError(error, 'Save joke reaction error');
  }
}
