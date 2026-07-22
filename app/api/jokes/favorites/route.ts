import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest, handleApiError, successResponse } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);

    const favorites = await query(
      `SELECT jr.joke_external_id as external_id,
              COALESCE(MAX(jc.category), MAX(jr.category)) as category,
              MAX(jc.joke_type) as type,
              MAX(jc.setup) as setup,
              MAX(jc.delivery) as delivery,
              MAX(jc.joke) as joke,
              COALESCE(BOOL_OR(jc.safe), TRUE) as safe,
              MAX(jr.created_at) as favorited_at
       FROM joke_reactions jr
       LEFT JOIN jokes_cache jc ON jr.joke_external_id = jc.external_id
       WHERE jr.user_id = $1
         AND jr.reaction = 'favorite'
       GROUP BY jr.joke_external_id
       ORDER BY favorited_at DESC`,
      [payload.id]
    );

    return successResponse({ favorites });
  } catch (error: any) {
    return handleApiError(error, 'Get favorite jokes error');
  }
}
